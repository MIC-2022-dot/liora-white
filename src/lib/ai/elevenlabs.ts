import { supabase } from "@/integrations/supabase/client";

export type GenerateAiSpeechOptions = {
  voiceId?: string;
  modelId?: string;
};

export type ElevenLabsVoice = {
  id: string;
  name: string;
  category?: string | null;
  description?: string | null;
};

type SupabaseInvokeResponse = string | Record<string, unknown> | null;

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

export async function listElevenLabsVoices(): Promise<ElevenLabsVoice[]> {
  const res = await supabase.functions.invoke("elevenlabs-tts", {
    method: "GET",
  });

  if (res.error) {
    throw new Error(res.error.message || "Could not load ElevenLabs voices");
  }

  type VoicesResponse = {
    voices: Array<{
      voice_id?: string;
      id?: string;
      name?: string;
      category?: string | null;
      description?: string | null;
      voice?: { name?: string };
    }>;
  };

  const data = parseSupabaseResponse<VoicesResponse>(res.data);

  if (!data || !Array.isArray(data.voices)) {
    throw new Error("Unexpected ElevenLabs voices response");
  }

  return data.voices.map((voice) => ({
    id: voice.voice_id ?? voice.id ?? "",
    name: voice.name ?? voice.voice?.name ?? "Unknown voice",
    category: voice.category ?? null,
    description: voice.description ?? null,
  }));
}

export async function generateAiSpeech(text: string, options: GenerateAiSpeechOptions = {}) {
  if (!text || !text.trim()) throw new Error("text is required");

  let voiceId = options.voiceId;
  if (!voiceId) {
    const voiceRow = await supabase.from("avatar_voice_settings").select("voice_id").maybeSingle();
    if (voiceRow.error) throw new Error(voiceRow.error.message);
    voiceId = voiceRow.data?.voice_id ?? null;
  }

  if (!voiceId) {
    throw new Error("No voice is configured. Choose a voice in Studio first.");
  }

  const payload = { text, voiceId, modelId: options.modelId };
  const res = await supabase.functions.invoke("elevenlabs-tts", {
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
  });

  if (res.error) {
    throw new Error(res.error.message || "ElevenLabs function error");
  }

  type SpeechResponse = { audio: string; mime?: string };
  const data = parseSupabaseResponse<SpeechResponse>(res.data);

  if (!data || !data.audio) throw new Error("No audio returned from ElevenLabs function");

  const b64 = data.audio;
  const mime = data.mime || "audio/mpeg";

  const binary = atob(b64);
  const len = binary.length;
  const u8 = new Uint8Array(len);
  for (let i = 0; i < len; i++) u8[i] = binary.charCodeAt(i);
  const blob = new Blob([u8.buffer], { type: mime });
  const url = URL.createObjectURL(blob);

  return { url, blob } as { url: string; blob: Blob };
}
