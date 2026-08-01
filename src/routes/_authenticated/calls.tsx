import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Phone, PhoneIncoming, PhoneMissed, PhoneOutgoing, Sparkle, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useCall } from "@/lib/calls";
import { duration, listTime } from "@/lib/format";
import { UserAvatar } from "@/components/liora/user-avatar";
import { EmptyState, ListSkeleton } from "@/components/liora/states";
import { Button } from "@/components/ui/button";

type Row = {
  id: string;
  caller_id: string;
  callee_id: string;
  kind: "voice" | "video";
  status: string;
  answered_mode: "human" | "ai" | null;
  duration_seconds: number | null;
  started_at: string;
  peer: {
    id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
};

export const Route = createFileRoute("/_authenticated/calls")({
  head: () => ({
    meta: [
      { title: "Calls · Liora" },
      { name: "description", content: "Your Liora call history, including AI-answered calls." },
      { property: "og:title", content: "Calls · Liora" },
      {
        property: "og:description",
        content: "Your Liora call history, including AI-answered calls.",
      },
    ],
  }),
  component: Calls,
});

function Calls() {
  const { user } = useAuth();
  const { startCall } = useCall();
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const load = async () => {
      const { data } = await supabase
        .from("call_history")
        .select("*")
        .or(`caller_id.eq.${user.id},callee_id.eq.${user.id}`)
        .order("started_at", { ascending: false })
        .limit(100);
      const peerIds = [
        ...new Set(
          (data ?? []).map((r) => (r.caller_id === user.id ? r.callee_id : r.caller_id)),
        ),
      ];
      const { data: profiles } = peerIds.length
        ? await supabase
            .from("profiles")
            .select("id, display_name, username, avatar_url")
            .in("id", peerIds)
        : { data: [] };
      const map = new Map((profiles ?? []).map((p) => [p.id, p]));
      if (!active) return;
      setRows(
        (data ?? []).map((r) => ({
          ...r,
          peer: map.get(r.caller_id === user.id ? r.callee_id : r.caller_id) ?? null,
        })) as Row[],
      );
    };
    void load();
    const channel = supabase
      .channel(`calls:${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "call_history" }, () =>
        void load(),
      )
      .subscribe();
    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="border-b border-border px-4 py-4">
        <h1 className="font-display text-2xl">Calls</h1>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {rows === null ? (
          <ListSkeleton rows={5} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Phone className="size-5" />}
            title="No calls yet"
            body="Voice and video calls you make or receive will appear here."
          />
        ) : (
          <ul className="p-2">
            {rows.map((r) => {
              const outgoing = r.caller_id === user?.id;
              const missed = r.status === "missed" || r.status === "declined";
              const Icon = missed ? PhoneMissed : outgoing ? PhoneOutgoing : PhoneIncoming;
              return (
                <li key={r.id} className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-accent">
                  <UserAvatar profile={r.peer} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {r.peer?.display_name ?? r.peer?.username ?? "Unknown"}
                    </p>
                    <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                      <Icon className={missed ? "size-3.5 text-destructive" : "size-3.5"} />
                      {listTime(r.started_at)}
                      {r.duration_seconds ? ` · ${duration(r.duration_seconds)}` : ""}
                      {r.answered_mode === "ai" && (
                        <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-primary/12 px-1.5 py-0.5 text-[10px] text-primary">
                          <Sparkle className="size-2.5" /> AI
                        </span>
                      )}
                    </p>
                  </div>
                  {r.peer && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={r.kind === "video" ? "Video call back" : "Call back"}
                      onClick={() => void startCall(r.peer!, r.kind)}
                    >
                      {r.kind === "video" ? <Video className="size-5" /> : <Phone className="size-5" />}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
