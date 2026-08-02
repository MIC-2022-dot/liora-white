/**
 * Voice provider abstraction (text-to-speech for the AI representation).
 *
 * Add `VOICE_PROVIDER_API_KEY` (+ optional `VOICE_PROVIDER`) to connect a real
 * voice provider. Keys are only ever read on the server.
 */

export { VOICE_CATALOG, type VoiceOption } from "@/lib/voice-catalog";

export function voiceProviderStatus() {
  const key = process.env["VOICE_PROVIDER_API_KEY"];
  if (!key) {
    return {
      configured: false as const,
      message:
        "Voice provider is not connected yet. Add the voice provider credentials to hear previews and enable spoken AI calls.",
    };
  }
  return { configured: true as const, provider: process.env["VOICE_PROVIDER"] ?? "custom" };
}

export async function synthesizeSpeech(input: {
  text: string;
  voiceId: string | null;
  speed: number;
  pitch: number;
}): Promise<{ audioBase64: string; mimeType: string }> {
  const status = voiceProviderStatus();
  if (!status.configured) throw new Error(status.message);
  void input;
  throw new Error(
    `Voice provider "${status.provider}" is configured but no client implementation is wired yet.`,
  );
}
