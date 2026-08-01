import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

type PresenceState = { onlineIds: Set<string>; isOnline: (id: string | null | undefined) => boolean };

const PresenceContext = createContext<PresenceState>({
  onlineIds: new Set(),
  isOnline: () => false,
});

export function PresenceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel("liora-presence", {
      config: { presence: { key: user.id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setOnlineIds(new Set(Object.keys(state)));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    // A single durable "last seen" write per session, not per keystroke.
    void supabase
      .from("user_presence")
      .upsert({ user_id: user.id, status: "online", last_seen: new Date().toISOString() });

    const markOffline = () => {
      void supabase
        .from("user_presence")
        .upsert({ user_id: user.id, status: "offline", last_seen: new Date().toISOString() });
    };
    window.addEventListener("beforeunload", markOffline);

    return () => {
      window.removeEventListener("beforeunload", markOffline);
      markOffline();
      void supabase.removeChannel(channel);
    };
  }, [user]);

  const value = useMemo(
    () => ({ onlineIds, isOnline: (id?: string | null) => Boolean(id && onlineIds.has(id)) }),
    [onlineIds],
  );

  return <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>;
}

export function usePresence() {
  return useContext(PresenceContext);
}
