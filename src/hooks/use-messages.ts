import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string | null;
  kind: "text" | "image" | "audio" | "file";
  media_url: string | null;
  media_meta: Record<string, unknown> | null;
  reply_to: string | null;
  created_at: string;
  deleted_at: string | null;
};

export type Reaction = { message_id: string; emoji: string; user_id: string };

/** Live message list for one conversation, plus reactions and read state. */
export function useMessages(conversationId: string | null, peerId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [peerLastRead, setPeerLastRead] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!conversationId) return;
    const { data, error: err } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(500);
    if (err) {
      setError(err.message);
      return;
    }
    setError(null);
    setMessages((data ?? []) as ChatMessage[]);

    const ids = (data ?? []).map((m) => m.id);
    if (ids.length) {
      const { data: rx } = await supabase
        .from("message_reactions")
        .select("message_id, emoji, user_id")
        .in("message_id", ids);
      setReactions((rx ?? []) as Reaction[]);
    } else {
      setReactions([]);
    }
  }, [conversationId]);

  const loadPeerRead = useCallback(async () => {
    if (!conversationId || !peerId) return;
    const { data } = await supabase
      .from("conversation_participants")
      .select("last_read_at")
      .eq("conversation_id", conversationId)
      .eq("user_id", peerId)
      .maybeSingle();
    setPeerLastRead(data?.last_read_at ?? null);
  }, [conversationId, peerId]);

  useEffect(() => {
    setMessages(null);
    void load();
    void loadPeerRead();
  }, [load, loadPeerRead]);

  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => void load(),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "message_reactions" }, () =>
        void load(),
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "conversation_participants",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => void loadPeerRead(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, load, loadPeerRead]);

  return { messages, reactions, peerLastRead, error, reload: load };
}
