import { createFileRoute } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useNotifications } from "@/hooks/use-notifications";
import { relativeTime } from "@/lib/format";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/liora/states";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications · Liora" },
      { name: "description", content: "Messages, calls and account updates from Liora." },
      { property: "og:title", content: "Notifications · Liora" },
      { property: "og:description", content: "Messages, calls and account updates from Liora." },
    ],
  }),
  component: Notifications,
});

function Notifications() {
  const { user } = useAuth();
  const { items, error } = useNotifications();

  async function markAllRead() {
    if (!user) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-3 border-b border-border px-4 py-4">
        <h1 className="font-display text-2xl">Notifications</h1>
        {(items ?? []).some((n) => !n.read) && (
          <Button variant="ghost" size="sm" className="ml-auto" onClick={() => void markAllRead()}>
            Mark all read
          </Button>
        )}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {error ? (
          <ErrorState message={error} />
        ) : items === null ? (
          <ListSkeleton rows={4} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Bell className="size-5" />}
            title="Nothing new"
            body="Updates about your messages, calls and account will show up here."
          />
        ) : (
          <ul className="divide-y divide-border">
            {items.map((n) => (
              <li key={n.id} className={cn("px-4 py-4", !n.read && "bg-accent/40")}>
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "mt-1.5 size-2 shrink-0 rounded-full",
                      n.read ? "bg-transparent" : "bg-primary",
                    )}
                  />
                  <div className="min-w-0">
                    <p className="font-medium">{n.title}</p>
                    {n.body && <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {relativeTime(n.created_at)}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
