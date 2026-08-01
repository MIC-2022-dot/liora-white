import { useMemo, useState } from "react";
import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { MessageCircle, Search, SquarePen } from "lucide-react";
import { cn } from "@/lib/utils";
import { listTime } from "@/lib/format";
import { useConversations } from "@/hooks/use-conversations";
import { usePresence } from "@/lib/presence";
import { UserAvatar } from "@/components/liora/user-avatar";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/liora/states";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/chats")({
  head: () => ({
    meta: [
      { title: "Chats · Liora" },
      { name: "description", content: "Your private Liora conversations, in real time." },
      { property: "og:title", content: "Chats · Liora" },
      { property: "og:description", content: "Your private Liora conversations, in real time." },
    ],
  }),
  component: ChatsLayout,
});

function ChatsLayout() {
  const { items, error, reload } = useConversations();
  const { isOnline } = usePresence();
  const location = useLocation();
  const [query, setQuery] = useState("");

  const inThread = /^\/chats\/[^/]+$/.test(location.pathname);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return (items ?? []).filter((c) =>
      [c.peer?.display_name, c.peer?.username, c.last_message_preview]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q)),
    );
  }, [items, query]);

  return (
    <div className="flex min-h-0 flex-1">
      <div
        className={cn(
          "flex min-h-0 w-full flex-col border-r border-border md:w-[360px] md:shrink-0",
          inThread && "hidden md:flex",
        )}
      >
        <header className="flex items-center gap-3 border-b border-border px-4 py-4">
          <h1 className="font-display text-2xl">Chats</h1>
          <Button asChild size="icon" variant="ghost" className="ml-auto">
            <Link to="/contacts" aria-label="Start a new chat">
              <SquarePen className="size-5" />
            </Link>
          </Button>
        </header>

        <div className="px-3 py-2">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search conversations"
              className="rounded-full pl-9"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {error ? (
            <ErrorState message={error} onRetry={() => void reload()} />
          ) : items === null ? (
            <ListSkeleton />
          ) : (filtered ?? []).length === 0 ? (
            <EmptyState
              icon={<MessageCircle className="size-5" />}
              title={query ? "No matches" : "No conversations yet"}
              body={
                query
                  ? "Try a different name or word."
                  : "Find someone by username and start talking."
              }
              action={
                !query && (
                  <Button asChild>
                    <Link to="/contacts">Find people</Link>
                  </Button>
                )
              }
            />
          ) : (
            <ul className="p-2">
              {(filtered ?? []).map((c) => (
                <li key={c.id}>
                  <Link
                    to="/chats/$id"
                    params={{ id: c.id }}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-accent",
                      location.pathname === `/chats/${c.id}` && "bg-accent",
                    )}
                  >
                    <UserAvatar profile={c.peer} online={isOnline(c.peer?.id)} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <p className="truncate font-medium">
                          {c.peer?.display_name ?? c.peer?.username ?? "Unknown"}
                        </p>
                        <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">
                          {listTime(c.last_message_at)}
                        </span>
                      </div>
                      <p
                        className={cn(
                          "truncate text-sm",
                          c.unread ? "font-medium text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {c.last_message_preview ?? "No messages yet"}
                      </p>
                    </div>
                    {c.unread && <span className="size-2 shrink-0 rounded-full bg-primary" />}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className={cn("min-h-0 flex-1 flex-col", inThread ? "flex" : "hidden md:flex")}>
        <Outlet />
      </div>
    </div>
  );
}
