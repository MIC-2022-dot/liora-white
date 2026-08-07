/**
 * Server functions for AI contextual image retrieval.
 *
 * These are called by the chat autopilot when the AI decides a visual
 * response is relevant. All authorization is verified server-side.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Retrieves the best matching image for a recipient based on the requested
 * context. Returns the image record (without the storage path) or null.
 */
export const retrieveImageForRecipient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (input: {
      recipientId: string;
      conversationId: string;
      tags?: string[];
      activity?: string | null;
      location?: string | null;
      time?: "morning" | "afternoon" | "evening" | "night" | "anytime" | null;
      currentStateOnly?: boolean;
    }) => {
      if (!input?.recipientId) throw new Error("recipientId is required");
      if (!input?.conversationId) throw new Error("conversationId is required");
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    const { assertStudio } = await import("@/lib/studio-guard.server");
    await assertStudio(context);

    const { retrieveBestImage } = await import("@/lib/image-knowledge.server");
    const input: {
      ownerId: string;
      recipientId: string;
      tags?: string[];
      activity?: string | null;
      location?: string | null;
      time?: "morning" | "afternoon" | "evening" | "night" | "anytime" | null;
      currentStateOnly?: boolean;
    } = { ownerId: context.userId, recipientId: data.recipientId };
    if (data.tags) input.tags = data.tags;
    if (data.activity) input.activity = data.activity;
    if (data.location) input.location = data.location;
    if (data.time) input.time = data.time;
    if (data.currentStateOnly) input.currentStateOnly = data.currentStateOnly;

    const image = await retrieveBestImage(context.supabase, input);

    if (!image) return { image: null };

    // Return the image without exposing the storage path to the client.
    return {
      image: {
        id: image.id,
        title: image.title,
        description: image.description,
        tags: image.tags,
        activity: image.activity,
        location_context: image.location_context,
        time_context: image.time_context,
        image_state: image.image_state,
        priority: image.priority,
      },
    };
  });

/**
 * Sends a library image to a recipient through the existing messaging system.
 * Verifies the image still exists, is AI-approved, and hasn't been sent to
 * this recipient under the active reuse policy. Records usage only after
 * the message send succeeds.
 */
export const sendLibraryImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (input: {
      imageId: string;
      recipientId: string;
      conversationId: string;
      caption?: string | null;
    }) => {
      if (!input?.imageId) throw new Error("imageId is required");
      if (!input?.recipientId) throw new Error("recipientId is required");
      if (!input?.conversationId) throw new Error("conversationId is required");
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    const { assertStudio } = await import("@/lib/studio-guard.server");
    await assertStudio(context);

    const { listRecipientUsage, filterByRecipientHistory } =
      await import("@/lib/image-knowledge.server");

    // 1. Verify the image still exists and is AI-approved.
    const { data: image } = await context.supabase
      .from("image_library")
      .select("*")
      .eq("id", data.imageId)
      .eq("user_id", context.userId)
      .eq("ai_enabled", true)
      .maybeSingle();
    if (!image) throw new Error("Image is no longer available");

    // 2. Verify the recipient is a participant in this conversation.
    const { data: participant } = await context.supabase
      .from("conversation_participants")
      .select("user_id")
      .eq("conversation_id", data.conversationId)
      .eq("user_id", data.recipientId)
      .maybeSingle();
    if (!participant) throw new Error("Recipient is not in this conversation");

    // 3. Verify the image hasn't already been sent to this recipient.
    const usage = await listRecipientUsage(context.supabase, context.userId, data.recipientId);
    const eligible = filterByRecipientHistory([image as never], usage);
    if (!eligible.length) throw new Error("Image already sent to this recipient");

    // 4. Send through the existing messaging system.
    const { sendMessage } = await import("@/lib/chat");
    const messageId = await sendMessage({
      conversationId: data.conversationId,
      senderId: context.userId,
      body: data.caption ?? null,
      kind: "image",
      mediaUrl: image.storage_path,
      mediaMeta: {
        library_image: true,
        image_id: image.id,
        title: image.title,
        description: image.description,
      },
    });

    // 5. Record usage only after the message send succeeds.
    const { recordImageUsage } = await import("@/lib/image-knowledge.server");
    await recordImageUsage(context.supabase, {
      imageId: image.id,
      ownerId: context.userId,
      recipientId: data.recipientId,
      conversationId: data.conversationId,
      messageId,
    });

    return { ok: true, messageId };
  });
