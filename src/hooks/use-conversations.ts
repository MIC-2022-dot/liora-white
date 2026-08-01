import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type ConversationSummary = {
  id: string;
  last_message_at: string;
  last_message_preview: string | null;
  last_read_at: string;
  peer: {
    id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
  unread: boolean;
};

/** Live list of the signed-in user's conversations, newest activity first. */
export function useConversations() {
  const { user } = useAuth();
  const [items, setItems] = useState<ConversationSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const { data: parts, error: partErr } = await supabase
      .from("conversation_participants")
      .select("conversation_id, last_read_at")
      .eq("user_id", user.id);
    if (partErr) {
      setError(partErr.message);
      return;
    }
    const ids = (parts ?? []).map((p) => p.conversation_id);
    if (!ids.length) {
      setItems([]);
      return;
    }

    const [{ data: convos, error: convoErr }, { data: others }] = await Promise.all([
      supabase
        .from("conversations")
        .select("id, last_message_at, last_message_preview")
        .in("id", ids)
        .order("last_message_at", { ascending: false }),
      supabase
        .from("conversation_participants")
        .select("conversation_id, user_id")
        .in("conversation_id", ids)
        .neq("user_id", user.id),
    ]);
    if (convoErr) {
      setError(convoErr.message);
      return;
    }

    const peerIds = [...new Set((others ?? []).map((o) => o.user_id))];
    const { data: profiles } = peerIds.length
      ? await supabase
          .from("profiles")
          .select("id, display_name, username, avatar_url")
          .in("id", peerIds)
      : { data: [] };

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
    const peerByConvo = new Map((others ?? []).map((o) => [o.conversation_id, o.user_id]));
    const readMap = new Map((parts ?? []).map((p) => [p.conversation_id, p.last_read_at]));

    setError(null);
    setItems(
      (convos ?? []).map((c) => {
        const lastRead = readMap.get(c.id) ?? c.last_message_at;
        return {
          id: c.id,
          last_message_at: c.last_message_at,
          last_message_preview: c.last_message_preview,
          last_read_at: lastRead,
          peer: profileMap.get(peerByConvo.get(c.id) ?? "") ?? null,
          unread: new Date(c.last_message_at) > new Date(lastRead),
        };
      }),
    );
  }, [user]);

  useEffect(() => {
    void load();
    if (!user) return;
    const channel = supabase
      .channel(`conversations:${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () =>
        void load(),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "conversation_participants" }, () =>
        void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, load]);

  return { items, error, reload: load };
}
