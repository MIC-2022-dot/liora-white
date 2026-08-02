/** Client-safe catalogue of voice slots offered in Studio. */
export type VoiceOption = { id: string; name: string; description: string };

export const VOICE_CATALOG: VoiceOption[] = [
  { id: "warm-low", name: "Warm — low", description: "Calm, grounded, unhurried" },
  { id: "warm-mid", name: "Warm — mid", description: "Friendly and conversational" },
  { id: "bright", name: "Bright", description: "Light, quick, expressive" },
  { id: "soft", name: "Soft", description: "Gentle, close-mic, intimate" },
  { id: "neutral", name: "Neutral", description: "Even and professional" },
  { id: "deep", name: "Deep", description: "Resonant and slow" },
];

export const EMOTIONS = ["neutral", "warm", "upbeat", "serious", "playful"] as const;
