import { supabase } from "@/integrations/supabase/client";

/** Finds the existing 1:1 conversation with `otherUserId`, or creates one. */
export async function getOrCreateConversation(myId: string, otherUserId: string) {
  const { data: mine, error: mineErr } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", myId);
  if (mineErr) throw new Error(mineErr.message);

  const ids = (mine ?? []).map((r) => r.conversation_id);
  if (ids.length) {
    const { data: shared } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", otherUserId)
      .in("conversation_id", ids)
      .limit(1);
    const existing = shared?.[0]?.conversation_id;
    if (existing) return existing;
  }

  const { data: convo, error } = await supabase
    .from("conversations")
    .insert({ created_by: myId })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const { error: partErr } = await supabase.from("conversation_participants").insert([
    { conversation_id: convo.id, user_id: myId },
    { conversation_id: convo.id, user_id: otherUserId },
  ]);
  if (partErr) throw new Error(partErr.message);

  return convo.id;
}

export async function sendMessage(input: {
  conversationId: string;
  senderId: string;
  body?: string | null;
  kind?: "text" | "image" | "video" | "audio" | "file";
  mediaUrl?: string | null;
  mediaMeta?: Record<string, unknown> | null;
  replyTo?: string | null;
}) {
  const kind = input.kind ?? "text";
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: input.conversationId,
      sender_id: input.senderId,
      body: input.body ?? null,
      kind,
      media_url: input.mediaUrl ?? null,
      media_meta: (input.mediaMeta ?? null) as never,
      reply_to: input.replyTo ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const preview =
    kind === "text"
      ? (input.body ?? "")
      : kind === "image"
        ? "Photo"
        : kind === "video"
          ? "Video"
          : kind === "audio"
            ? "Voice message"
            : "Attachment";

  await supabase
    .from("conversations")
    .update({ last_message_at: new Date().toISOString(), last_message_preview: preview.slice(0, 140) })
    .eq("id", input.conversationId);

  return data.id;
}

export async function markConversationRead(conversationId: string, userId: string) {
  await supabase
    .from("conversation_participants")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", userId);
}

export async function markMessagesRead(messageIds: string[], userId: string) {
  if (!messageIds.length) return;
  await supabase
    .from("message_reads")
    .upsert(messageIds.map((id) => ({ message_id: id, user_id: userId })), {
      onConflict: "message_id,user_id",
    });
}
