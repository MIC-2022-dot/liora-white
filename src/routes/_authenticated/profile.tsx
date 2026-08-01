import { createFileRoute, Link } from "@tanstack/react-router";
import { LogOut, Settings, Sparkle } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { UserAvatar } from "@/components/liora/user-avatar";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Your profile · Liora" },
      { name: "description", content: "Your Liora identity: name, username, photo and bio." },
      { property: "og:title", content: "Your profile · Liora" },
      { property: "og:description", content: "Your Liora identity: name, username, photo and bio." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { profile, hasStudio, signOut } = useAuth();

  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-5 py-8">
      <div className="flex items-center gap-4">
        <UserAvatar profile={profile} size="xl" />
        <div className="min-w-0">
          <h1 className="font-display text-2xl">{profile?.display_name ?? "You"}</h1>
          <p className="text-sm text-muted-foreground">@{profile?.username ?? "…"}</p>
        </div>
      </div>
      {profile?.bio && <p className="mt-5 text-sm leading-relaxed">{profile.bio}</p>}

      <div className="mt-8 space-y-2">
        <Button asChild variant="outline" className="w-full justify-start">
          <Link to="/settings">
            <Settings className="size-4" /> Settings
          </Link>
        </Button>
        {hasStudio && (
          <Button asChild variant="outline" className="w-full justify-start">
            <Link to="/studio">
              <Sparkle className="size-4" /> Studio
            </Link>
          </Button>
        )}
        <Button variant="ghost" className="w-full justify-start" onClick={() => void signOut()}>
          <LogOut className="size-4" /> Sign out
        </Button>
      </div>
    </div>
  );
}
