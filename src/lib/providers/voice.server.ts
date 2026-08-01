/**
 * Voice provider abstraction (text-to-speech for the AI representation).
 *
 * Add `VOICE_PROVIDER_API_KEY` (+ optional `VOICE_PROVIDER`) to connect a real
 * voice provider. Keys are only ever read on the server.
 */

export type VoiceOption = { id: string; name: string; description: string };

/** Curated voice slots the owner can assign; ids map to the provider once connected. */
export const VOICE_CATALOG: VoiceOption[] = [
  { id: "warm-low", name: "Warm — low", description: "Calm, grounded, unhurried" },
  { id: "warm-mid", name: "Warm — mid", description: "Friendly and conversational" },
  { id: "bright", name: "Bright", description: "Light, quick, expressive" },
  { id: "soft", name: "Soft", description: "Gentle, close-mic, intimate" },
  { id: "neutral", name: "Neutral", description: "Even and professional" },
  { id: "deep", name: "Deep", description: "Resonant and slow" },
];

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
