import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { MessageCircle, Phone, Video } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { usePresence } from "@/lib/presence";
import { useCall } from "@/lib/calls";
import { getOrCreateConversation } from "@/lib/chat";
import { UserAvatar } from "@/components/liora/user-avatar";
import { EmptyState, LoadingState } from "@/components/liora/states";
import { Button } from "@/components/ui/button";

type Person = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
};

export const Route = createFileRoute("/_authenticated/u/$username")({
  head: () => ({
    meta: [
      { title: "Profile · Liora" },
      { name: "description", content: "A Liora member profile." },
      { property: "og:title", content: "Profile · Liora" },
      { property: "og:description", content: "A Liora member profile." },
    ],
  }),
  component: PublicProfile,
});

function PublicProfile() {
  const { username } = Route.useParams();
  const { user } = useAuth();
  const { isOnline } = usePresence();
  const { startCall } = useCall();
  const navigate = useNavigate();
  const [person, setPerson] = useState<Person | null | undefined>(undefined);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url, bio")
        .eq("username", username)
        .maybeSingle();
      setPerson((data as Person) ?? null);
    })();
  }, [username]);

  if (person === undefined) return <LoadingState />;
  if (!person)
    return <EmptyState title="Profile not found" body="No Liora member uses that username." />;

  async function openChat() {
    if (!user || !person) return;
    try {
      const id = await getOrCreateConversation(user.id, person.id);
      void navigate({ to: "/chats/$id", params: { id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not open that conversation");
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-5 py-10 text-center">
      <div className="flex flex-col items-center">
        <UserAvatar profile={person} size="xl" online={isOnline(person.id)} />
        <h1 className="mt-4 font-display text-2xl">{person.display_name ?? person.username}</h1>
        <p className="text-sm text-muted-foreground">@{person.username}</p>
        {person.bio && <p className="mt-4 max-w-sm text-sm leading-relaxed">{person.bio}</p>}
      </div>

      {person.id !== user?.id && (
        <div className="mt-8 flex justify-center gap-2">
          <Button onClick={() => void openChat()}>
            <MessageCircle className="size-4" /> Message
          </Button>
          <Button variant="outline" onClick={() => void startCall(person, "voice")}>
            <Phone className="size-4" /> Call
          </Button>
          <Button variant="outline" onClick={() => void startCall(person, "video")}>
            <Video className="size-4" /> Video
          </Button>
        </div>
      )}
    </div>
  );
}
