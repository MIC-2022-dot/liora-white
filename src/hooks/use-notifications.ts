import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  data: unknown;
  read: boolean;
  created_at: string;
};

export function useNotifications() {
  const { user } = useAuth();
  const [items, setItems] = useState<Notification[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;

    const load = async () => {
      const { data, error: err } = await supabase
        .from("notifications")
        .select("id, type, title, body, data, read, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (!active) return;
      if (err) setError(err.message);
      else setItems((data ?? []) as Notification[]);
    };
    void load();

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => void load(),
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [user]);

  return { items, error };
}

export function useUnreadNotifications() {
  const { items } = useNotifications();
  return (items ?? []).filter((n) => !n.read).length;
}
