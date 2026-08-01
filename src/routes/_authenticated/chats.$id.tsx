import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Phone, Video } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { usePresence } from "@/lib/presence";
import { useCall } from "@/lib/calls";
import { useMessages, type ChatMessage } from "@/hooks/use-messages";
import { markConversationRead } from "@/lib/chat";
import { dayLabel } from "@/lib/format";
import { UserAvatar } from "@/components/liora/user-avatar";
import { MessageBubble } from "@/components/liora/message-bubble";
import { Composer } from "@/components/liora/composer";
import { ErrorState, LoadingState } from "@/components/liora/states";
import { Button } from "@/components/ui/button";

type Peer = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

export const Route = createFileRoute("/_authenticated/chats/$id")({
  head: () => ({
    meta: [
      { title: "Conversation · Liora" },
      { name: "description", content: "A private, real-time Liora conversation." },
      { property: "og:title", content: "Conversation · Liora" },
      { property: "og:description", content: "A private, real-time Liora conversation." },
    ],
  }),
  component: Thread,
});

function Thread() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const { isOnline } = usePresence();
  const { startCall } = useCall();
  const navigate = useNavigate();

  const [peer, setPeer] = useState<Peer | null>(null);
  const [peerError, setPeerError] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [peerTyping, setPeerTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingChannel = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastTypingSent = useRef(0);

  const { messages, reactions, peerLastRead, error } = useMessages(id, peer?.id ?? null);

  // Resolve the other participant.
  useEffect(() => {
    if (!user) return;
    let active = true;
    void (async () => {
      const { data, error: err } = await supabase
        .from("conversation_participants")
        .select("user_id")
        .eq("conversation_id", id)
        .neq("user_id", user.id)
        .maybeSingle();
      if (!active) return;
      if (err) {
        setPeerError(err.message);
        return;
      }
      if (!data) {
        setPeerError("This conversation is no longer available.");
        return;
      }
      const { data: p } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url")
        .eq("id", data.user_id)
        .maybeSingle();
      if (active) setPeer((p as Peer) ?? null);
    })();
    return () => {
      active = false;
    };
  }, [id, user]);

  // Typing indicator over Realtime broadcast (ephemeral, never stored).
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel(`typing:${id}`, { config: { broadcast: { self: false } } });
    let timer: ReturnType<typeof setTimeout> | null = null;
    channel
      .on("broadcast", { event: "typing" }, () => {
        setPeerTyping(true);
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => setPeerTyping(false), 3000);
      })
      .subscribe();
    typingChannel.current = channel;
    return () => {
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
      typingChannel.current = null;
    };
  }, [id, user]);

  const notifyTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastTypingSent.current < 1500) return;
    lastTypingSent.current = now;
    void typingChannel.current?.send({ type: "broadcast", event: "typing", payload: {} });
  }, []);

  // Mark read whenever new messages land while the thread is open.
  useEffect(() => {
    if (!user || !messages?.length) return;
    void markConversationRead(id, user.id);
  }, [id, user, messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, peerTyping]);

  const byId = useMemo(() => new Map((messages ?? []).map((m) => [m.id, m])), [messages]);

  async function react(messageId: string, emoji: string) {
    if (!user) return;
    const existing = reactions.find(
      (r) => r.message_id === messageId && r.user_id === user.id && r.emoji === emoji,
    );
    if (existing) {
      await supabase
        .from("message_reactions")
        .delete()
        .eq("message_id", messageId)
        .eq("user_id", user.id)
        .eq("emoji", emoji);
    } else {
      const { error: err } = await supabase
        .from("message_reactions")
        .insert({ message_id: messageId, user_id: user.id, emoji });
      if (err) toast.error("Could not add that reaction");
    }
  }

  if (peerError) return <ErrorState message={peerError} />;
  if (!peer || !user) return <LoadingState label="Opening conversation…" />;

  let lastDay = "";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-3 border-b border-border px-3 py-3">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => void navigate({ to: "/chats" })}
          aria-label="Back to chats"
        >
          <ArrowLeft className="size-5" />
        </Button>
        <Link
          to="/u/$username"
          params={{ username: peer.username ?? "" }}
          className="flex min-w-0 flex-1 items-center gap-3"
        >
          <UserAvatar profile={peer} online={isOnline(peer.id)} />
          <div className="min-w-0">
            <p className="truncate font-medium">{peer.display_name ?? peer.username}</p>
            <p className="truncate text-xs text-muted-foreground">
              {peerTyping ? "typing…" : isOnline(peer.id) ? "Online" : "Offline"}
            </p>
          </div>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => void startCall(peer, "voice")}
          aria-label="Voice call"
        >
          <Phone className="size-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => void startCall(peer, "video")}
          aria-label="Video call"
        >
          <Video className="size-5" />
        </Button>
      </header>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-4">
        {error && <ErrorState message={error} />}
        {messages === null ? (
          <LoadingState label="Loading messages…" />
        ) : messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Say hello to {peer.display_name ?? peer.username}.
          </p>
        ) : (
          messages.map((m) => {
            const day = dayLabel(m.created_at);
            const showDay = day !== lastDay;
            lastDay = day;
            const read =
              Boolean(peerLastRead) && new Date(m.created_at) <= new Date(peerLastRead!);
            return (
              <div key={m.id} className="space-y-2">
                {showDay && (
                  <div className="py-2 text-center text-[11px] tracking-wide text-muted-foreground uppercase">
                    {day}
                  </div>
                )}
                <MessageBubble
                  message={m}
                  mine={m.sender_id === user.id}
                  reactions={reactions.filter((r) => r.message_id === m.id)}
                  replyTo={m.reply_to ? (byId.get(m.reply_to) ?? null) : null}
                  read={read}
                  onReact={(emoji) => void react(m.id, emoji)}
                  onReply={() => setReplyTo(m)}
                />
              </div>
            );
          })
        )}
        {peerTyping && (
          <div className="flex items-center gap-1 pl-2 text-muted-foreground">
            <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.2s]" />
            <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.1s]" />
            <span className="size-1.5 animate-bounce rounded-full bg-current" />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <Composer
        conversationId={id}
        senderId={user.id}
        replyTo={replyTo}
        onClearReply={() => setReplyTo(null)}
        onTyping={notifyTyping}
      />
    </div>
  );
}
