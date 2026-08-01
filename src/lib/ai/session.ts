import { startAvatarCallSession, endAvatarCallSession } from "@/lib/studio.functions";

/**
 * Opens the AI representation for an active call.
 * Returns a human-readable notice describing the live state, so the UI never
 * pretends the avatar is streaming when the provider is not connected.
 */
export async function startAiSession(callId: string): Promise<string> {
  try {
    const handle = await startAvatarCallSession({ data: { callId } });
    if (handle.status === "provider_missing") return handle.message;
    return "Your AI representation is live on this call.";
  } catch (err) {
    return err instanceof Error ? err.message : "Could not start the AI representation.";
  }
}

export async function endAiSession(callId: string): Promise<void> {
  try {
    await endAvatarCallSession({ data: { callId } });
  } catch {
    /* session close is best-effort */
  }
}
