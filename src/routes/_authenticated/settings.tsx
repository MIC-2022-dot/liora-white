import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings · Liora" },
      { name: "description", content: "Manage your Liora profile details and account." },
      { property: "og:title", content: "Settings · Liora" },
      { property: "og:description", content: "Manage your Liora profile details and account." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { profile, refresh, user, signOut } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDisplayName(profile?.display_name ?? "");
    setBio(profile?.bio ?? "");
  }, [profile]);

  async function save() {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName.trim(), bio: bio.trim() || null })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error("Could not save your changes");
      return;
    }
    await refresh();
    toast.success("Saved");
  }

  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-5 py-8">
      <h1 className="font-display text-2xl">Settings</h1>

      <div className="mt-8 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="name">Display name</Label>
          <Input id="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bio">About</Label>
          <Textarea id="bio" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Username</Label>
          <Input value={profile?.username ?? ""} readOnly disabled />
          <p className="text-xs text-muted-foreground">Your username is how people find you.</p>
        </div>
        <Button onClick={() => void save()} disabled={saving}>
          Save changes
        </Button>
      </div>

      <div className="mt-12 border-t border-border pt-6">
        <Button variant="outline" onClick={() => void signOut()}>
          Sign out
        </Button>
      </div>
    </div>
  );
}
