import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { uploadTo, fileExt } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { UserAvatar } from "@/components/liora/user-avatar";
import { Wordmark } from "@/components/liora/wordmark";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up your Liora profile" },
      { name: "description", content: "Choose your username, name and photo to start using Liora." },
      { property: "og:title", content: "Set up your Liora profile" },
      {
        property: "og:description",
        content: "Choose your username, name and photo to start using Liora.",
      },
    ],
  }),
  component: Onboarding,
});

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

function Onboarding() {
  const { user, profile, refresh, loading } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    if (profile.onboarding_completed) {
      void navigate({ to: "/chats" });
      return;
    }
    setDisplayName((v) => v || (profile.display_name ?? ""));
    setUsername((v) => v || (profile.username ?? ""));
    setAvatarPath((v) => v ?? profile.avatar_url);
  }, [profile, navigate]);

  // Live username availability check.
  useEffect(() => {
    const value = username.trim().toLowerCase();
    if (!USERNAME_RE.test(value)) {
      setAvailable(null);
      return;
    }
    setChecking(true);
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", value)
        .maybeSingle();
      setAvailable(!data || data.id === user?.id);
      setChecking(false);
    }, 400);
    return () => clearTimeout(t);
  }, [username, user]);

  async function onPickPhoto(file: File) {
    if (!user) return;
    try {
      const path = `${user.id}/avatar-${Date.now()}.${fileExt(file, "jpg")}`;
      await uploadTo("avatars", path, file);
      setAvatarPath(path);
      setPreview(URL.createObjectURL(file));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not upload that photo");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const value = username.trim().toLowerCase();
    if (!USERNAME_RE.test(value)) {
      toast.error("Usernames are 3–20 characters: letters, numbers and underscores.");
      return;
    }
    if (available === false) {
      toast.error("That username is taken.");
      return;
    }
    if (!displayName.trim()) {
      toast.error("Add the name people will see.");
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        username: value,
        display_name: displayName.trim(),
        bio: bio.trim() || null,
        avatar_url: avatarPath,
        onboarding_completed: true,
      })
      .eq("id", user.id);
    setSaving(false);

    if (error) {
      toast.error(
        error.code === "23505" ? "That username is taken." : "Could not save your profile.",
      );
      return;
    }
    await refresh();
    void navigate({ to: "/chats" });
  }

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col items-center bg-background px-5 py-10">
      <Wordmark />
      <div className="mt-10 w-full max-w-md">
        <h1 className="font-display text-3xl">Make it yours</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This is how people will find and recognise you on Liora.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-6">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="group relative rounded-full"
              aria-label="Upload profile photo"
            >
              {preview ? (
                <img
                  src={preview}
                  alt=""
                  className="size-20 rounded-full object-cover"
                />
              ) : (
                <UserAvatar
                  profile={{ display_name: displayName, avatar_url: avatarPath }}
                  size="lg"
                  className="size-20"
                />
              )}
              <span className="absolute -right-1 -bottom-1 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Camera className="size-3.5" />
              </span>
            </button>
            <div className="text-sm text-muted-foreground">
              Add a photo
              <p className="text-xs">Optional, but it makes conversations feel human.</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onPickPhoto(f);
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="display-name">Display name</Label>
            <Input
              id="display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Ada Lovelace"
              maxLength={50}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <div className="relative">
              <span className="absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
                @
              </span>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ""))}
                placeholder="ada"
                className="pl-7"
                maxLength={20}
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {checking
                ? "Checking availability…"
                : available === true
                  ? "Available."
                  : available === false
                    ? "That username is taken."
                    : "3–20 characters: letters, numbers and underscores."}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">About you</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="A line people will see on your profile."
              maxLength={200}
              rows={3}
            />
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            Start using Liora
          </Button>
        </form>
      </div>
    </div>
  );
}
