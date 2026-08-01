/**
 * Avatar provider abstraction.
 *
 * Photorealistic avatar animation, lip-sync and real-time video streaming
 * require a specialised external provider (e.g. a talking-head / real-time
 * avatar API). Liora owns the identity source image, the behaviour config and
 * the call session lifecycle; the provider owns the rendering.
 *
 * Connecting a provider later means implementing the two functions below and
 * adding `AVATAR_PROVIDER_API_KEY` (+ `AVATAR_PROVIDER_URL`) as secrets. No
 * Studio UI or database change is required.
 */

export type AvatarProviderStatus =
  | { configured: true; provider: string }
  | { configured: false; message: string };

const NOT_CONFIGURED =
  "Avatar streaming provider is not connected yet. Add the avatar provider credentials to bring the live avatar online.";

export function avatarProviderStatus(): AvatarProviderStatus {
  const key = process.env["AVATAR_PROVIDER_API_KEY"];
  const provider = process.env["AVATAR_PROVIDER"] ?? "custom";
  if (!key) return { configured: false, message: NOT_CONFIGURED };
  return { configured: true, provider };
}

export type AvatarSessionHandle = {
  sessionId: string | null;
  streamUrl: string | null;
  status: "live" | "provider_missing";
  message: string;
};

/** Opens a live avatar stream for a call. */
export async function openAvatarStream(input: {
  userId: string;
  sourceImageUrl: string | null;
  behavior: Record<string, unknown> | null;
}): Promise<AvatarSessionHandle> {
  const status = avatarProviderStatus();
  if (!status.configured) {
    return {
      sessionId: null,
      streamUrl: null,
      status: "provider_missing",
      message: status.message,
    };
  }
  // Provider call goes here once credentials exist. Intentionally not faked.
  void input;
  throw new Error(
    `Avatar provider "${status.provider}" is configured but no client implementation is wired yet.`,
  );
}

/** Closes a live avatar stream. */
export async function closeAvatarStream(sessionId: string | null): Promise<void> {
  const status = avatarProviderStatus();
  if (!status.configured || !sessionId) return;
  throw new Error("Avatar provider stream teardown is not implemented yet.");
}

/** Analyses an uploaded identity photo for avatar suitability. */
export function analyseIdentityPhoto(meta: { width?: number; height?: number; bytes: number }) {
  const minSide = Math.min(meta.width ?? 0, meta.height ?? 0);
  const resolutionScore = minSide >= 1024 ? 1 : minSide >= 640 ? 0.75 : minSide > 0 ? 0.45 : 0.5;
  const sizeScore = meta.bytes > 150_000 ? 1 : meta.bytes > 60_000 ? 0.7 : 0.45;
  const score = Math.round(((resolutionScore + sizeScore) / 2) * 100) / 100;
  return {
    quality_score: score,
    notes:
      score >= 0.85
        ? "Sharp, well-sized portrait. Good identity source."
        : score >= 0.6
          ? "Usable, but a larger, sharper front-facing photo will preserve your likeness better."
          : "Low resolution. Upload a larger, well-lit, front-facing photo.",
  };
}
