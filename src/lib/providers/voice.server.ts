/**
 * Voice provider abstraction (text-to-speech for the AI representation).
 *
 * ElevenLabs is handled by a Supabase Edge Function so the secret stays server-side.
 */

import { supabase } from "@/integrations/supabase/client";
export { VOICE_CATALOG, type VoiceOption } from "@/lib/voice-catalog";

type SupabaseInvokeResponse = string | Record<string, unknown> | null;

type ElevenLabsVoiceStatus = {
  voices: unknown[];
};

function parseSupabaseResponse<T>(data: SupabaseInvokeResponse): T {
  if (typeof data === "string") {
    try {
      return JSON.parse(data) as T;
    } catch {
      throw new Error("Invalid response from ElevenLabs function");
    }
  }
  if (data === null || typeof data !== "object") {
    throw new Error("Unexpected response from ElevenLabs function");
  }
  return data as T;
}

export async function voiceProviderStatus(): Promise<
  { configured: true; provider: "elevenlabs" } | { configured: false; message: string }
> {
  try {
    const res = await supabase.functions.invoke("elevenlabs-tts", { method: "GET" });
    if (res.error) {
      return {
        configured: false,
        message:
          res.error.message ||
          "Voice provider is not connected yet. Add the voice provider credentials to hear previews and enable spoken AI calls.",
      };
    }

    type VoicesResponse = {
      voices: Array<unknown>;
    };

    const data = parseSupabaseResponse<VoicesResponse>(res.data);

    if (!data || !Array.isArray(data.voices) || data.voices.length === 0) {
      return {
        configured: false,
        message:
          "Voice provider is not connected yet. Add the voice provider credentials to hear previews and enable spoken AI calls.",
      };
    }

    return { configured: true, provider: "elevenlabs" };
  } catch (error) {
    return {
      configured: false,
      message:
        error instanceof Error
          ? error.message
          : "Voice provider is not connected yet. Add the voice provider credentials to hear previews and enable spoken AI calls.",
    };
  }
}

export async function synthesizeSpeech(input: {
  text: string;
  voiceId: string | null;
  speed: number;
  pitch: number;
  modelId?: string;
}): Promise<{ audioBase64: string; mimeType: string }> {
  if (!input.voiceId) {
    throw new Error("No voice is configured. Choose a voice in Studio first.");
  }

  const payload: { text: string; voiceId: string; modelId?: string } = {
    text: input.text,
    voiceId: input.voiceId,
  };
  if (input.modelId) payload.modelId = input.modelId;

  const res = await supabase.functions.invoke("elevenlabs-tts", {
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
  });

  if (res.error) {
    throw new Error(res.error.message || "Voice generation failed");
  }

  type SpeechResponse = { audio: string; mime?: string };
  const data = parseSupabaseResponse<SpeechResponse>(res.data);

  if (!data || !data.audio) {
    throw new Error("No audio returned from ElevenLabs function");
  }

  return { audioBase64: data.audio, mimeType: data.mime };
}
