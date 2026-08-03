import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Runtime server functions for the live AI representation:
 * speech-to-text for incoming call audio and the channel-aware reply engine
 * that powers spoken call replies, chat autopilot and voice notes.
 */

export const transcribeSpeech = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { audioBase64: string; mimeType?: string }) => {
    if (!input?.audioBase64) throw new Error("audioBase64 is required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { assertStudio } = await import("@/lib/studio-guard.server");
    await assertStudio(context);
    const { transcribeAudio, requireGatewayKey } = await import("@/lib/ai-runtime.server");
    return transcribeAudio({
      apiKey: requireGatewayKey(),
      audioBase64: data.audioBase64,
      ...(data.mimeType ? { mimeType: data.mimeType } : {}),
    });
  });

export const aiChannelReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      channel: "call" | "chat";
      messages: { role: "user" | "assistant"; content: string }[];
    }) => {
      if (!Array.isArray(input?.messages)) throw new Error("messages is required");
      return { channel: input.channel === "call" ? "call" : "chat", messages: input.messages.slice(-20) } as const;
    },
  )
  .handler(async ({ data, context }) => {
    const { assertStudio } = await import("@/lib/studio-guard.server");
    await assertStudio(context);
    const { generateChannelReply, requireGatewayKey } = await import("@/lib/ai-runtime.server");
    return generateChannelReply({
      supabase: context.supabase,
      userId: context.userId,
      channel: data.channel,
      messages: [...data.messages],
      apiKey: requireGatewayKey(),
    });
  });
