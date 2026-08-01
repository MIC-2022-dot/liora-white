import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Search, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { usePresence } from "@/lib/presence";
import { getOrCreateConversation } from "@/lib/chat";
import { UserAvatar } from "@/components/liora/user-avatar";
import { EmptyState, ListSkeleton } from "@/components/liora/states";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Person = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

export const Route = createFileRoute("/_authenticated/contacts")({
  head: () => ({
    meta: [
      { title: "Contacts · Liora" },
      { name: "description", content: "Find people by username and start a private conversation." },
      { property: "og:title", content: "Contacts · Liora" },
      {
        property: "og:description",
        content: "Find people by username and start a private conversation.",
      },
    ],
  }),
  component: Contacts,
});

function Contacts() {
  const { user } = useAuth();
  const { isOnline } = usePresence();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Person[] | null>(null);
  const [contacts, setContacts] = useState<Person[] | null>(null);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const { data } = await supabase.from("contacts").select("contact_id").eq("user_id", user.id);
      const ids = (data ?? []).map((c) => c.contact_id);
      if (!ids.length) return setContacts([]);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url")
        .in("id", ids);
      setContacts((profiles ?? []) as Person[]);
    })();
  }, [user]);

  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return setResults(null);
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url")
        .neq("id", user?.id ?? "")
        .eq("onboarding_completed", true)
        .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
        .limit(20);
      setResults((data ?? []) as Person[]);
    }, 300);
    return () => clearTimeout(t);
  }, [query, user]);

  async function openChat(person: Person) {
    if (!user) return;
    try {
      await supabase
        .from("contacts")
        .upsert({ user_id: user.id, contact_id: person.id }, { onConflict: "user_id,contact_id" });
      const conversationId = await getOrCreateConversation(user.id, person.id);
      void navigate({ to: "/chats/$id", params: { id: conversationId } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not open that conversation");
    }
  }

  const list = results ?? contacts;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="border-b border-border px-4 py-4">
        <h1 className="font-display text-2xl">Contacts</h1>
      </header>
      <div className="px-4 py-3">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by username or name"
            className="rounded-full pl-9"
          />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {list === null ? (
          <ListSkeleton rows={4} />
        ) : list.length === 0 ? (
          <EmptyState
            icon={query ? <Search className="size-5" /> : <Users className="size-5" />}
            title={query ? "Nobody found" : "No contacts yet"}
            body={
              query
                ? "Check the username and try again."
                : "Search for someone by their username to start talking."
            }
          />
        ) : (
          <ul className="p-2">
            {list.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-accent"
              >
                <UserAvatar profile={p} online={isOnline(p.id)} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{p.display_name ?? p.username}</p>
                  <p className="truncate text-sm text-muted-foreground">@{p.username}</p>
                </div>
                <Button size="sm" onClick={() => void openChat(p)}>
                  <UserPlus className="size-4" /> Message
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
