import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ImageUp, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { uploadTo, fileExt } from "@/lib/storage";
import { useSignedUrl } from "@/hooks/use-signed-url";
import { clearAvatarSource, saveAvatarSource, studioProviderStatus } from "@/lib/studio.functions";
import { Field, Panel, ProviderNotice, StatusPill, WorkspaceHeader } from "@/components/studio/ui";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/studio/avatar")({
  head: () => ({
    meta: [
      { title: "Avatar · Liora Studio" },
      {
        name: "description",
        content: "Upload your identity photo and tune how your avatar moves, blinks and reacts.",
      },
      { property: "og:title", content: "Avatar · Liora Studio" },
      {
        property: "og:description",
        content: "Upload your identity photo and tune how your avatar moves, blinks and reacts.",
      },
    ],
  }),
  component: AvatarWorkspace,
});

const BEHAVIOR: { key: string; label: string; hint: string }[] = [
  { key: "blinking", label: "Blinking", hint: "Natural eyelid rhythm" },
  { key: "eye_movement", label: "Eye movement", hint: "Gaze shifts and saccades" },
  { key: "head_movement", label: "Head movement", hint: "Micro-nods and turns" },
  { key: "smile", label: "Smiling", hint: "Baseline warmth in expression" },
  { key: "laugh", label: "Laughing", hint: "Frequency of laughter and giggles" },
  { key: "hand_gestures", label: "Hand gestures", hint: "Gesturing while speaking" },
  { key: "listening_reactions", label: "Listening reactions", hint: "Nods and acknowledgements" },
  { key: "speaking_energy", label: "Speaking energy", hint: "Overall animation while talking" },
  { key: "emotional_reactivity", label: "Emotional reactivity", hint: "Responsiveness of mood" },
];

const DEFAULTS: Record<string, number> = {
  blinking: 60,
  eye_movement: 55,
  head_movement: 50,
  smile: 50,
  laugh: 40,
  hand_gestures: 45,
  listening_reactions: 60,
  speaking_energy: 55,
  emotional_reactivity: 50,
};

function AvatarWorkspace() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [path, setPath] = useState<string | null>(null);
  const [quality, setQuality] = useState<number | null>(null);
  const [behavior, setBehavior] = useState<Record<string, number>>(DEFAULTS);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [provider, setProvider] = useState<{ configured: boolean; message: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const previewUrl = useSignedUrl("studio-media", path);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const [{ data: p }, { data: b }] = await Promise.all([
        supabase.from("avatar_profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("avatar_behavior_settings").select("*").eq("user_id", user.id).maybeSingle(),
      ]);
      setPath(p?.source_image_url ?? null);
      setQuality(p?.quality_score != null ? Number(p.quality_score) : null);
      if (b) {
        const next: Record<string, number> = { ...DEFAULTS };
        for (const { key } of BEHAVIOR) {
          const v = (b as Record<string, unknown>)[key];
          if (typeof v === "number") next[key] = v;
        }
        setBehavior(next);
      }
      setLoading(false);
    })();
    void studioProviderStatus()
      .then((s) => setProvider({ configured: s.avatar.configured, message: s.avatar.message }))
      .catch(() => setProvider(null));
  }, [user]);

  async function onUpload(file: File) {
    if (!user) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Upload an image file");
      return;
    }
    setBusy(true);
    try {
      const dims = await readDimensions(file);
      const target = `${user.id}/avatar-source-${Date.now()}.${fileExt(file, "jpg")}`;
      await uploadTo("studio-media", target, file);
      const analysis = await saveAvatarSource({
        data: { path: target, bytes: file.size, ...dims },
      });
      setPath(target);
      setQuality(analysis.quality_score);
      toast.success("Identity photo saved", { description: analysis.notes });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onRemove() {
    setBusy(true);
    try {
      await clearAvatarSource();
      setPath(null);
      setQuality(null);
      toast.success("Identity photo removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove the photo");
    } finally {
      setBusy(false);
    }
  }

  async function saveBehavior() {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("avatar_behavior_settings").upsert({
      user_id: user.id,
      ...behavior,
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) toast.error("Could not save behaviour settings");
    else toast.success("Behaviour saved");
  }

  return (
    <div className="space-y-6">
      <WorkspaceHeader
        eyebrow="Studio / Avatar"
        title="Avatar configuration"
        description="Your own photo is the identity source — Liora never swaps in a generated face. Behaviour settings control how that likeness moves once a streaming provider is connected."
        status={
          loading ? null : (
            <StatusPill state={path ? (provider?.configured ? "ready" : "pending") : "off"}>
              {path ? (provider?.configured ? "ready" : "source ready") : "setup required"}
            </StatusPill>
          )
        }
      />

      {loading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : (
        <>
          <Panel title="Identity source" hint="Private. Stored in your Studio media bucket.">
            <div className="flex flex-col gap-5 sm:flex-row">
              <div className="flex size-40 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Your avatar identity source"
                    className="size-full object-cover"
                  />
                ) : (
                  <ImageUp className="size-6 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Use a sharp, well-lit, front-facing portrait. Higher resolution preserves your
                  likeness more faithfully.
                </p>
                {quality != null && (
                  <p className="font-mono text-xs text-muted-foreground">
                    quality_score: {quality.toFixed(2)}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void onUpload(f);
                    }}
                  />
                  <Button size="sm" disabled={busy} onClick={() => fileRef.current?.click()}>
                    {busy ? <Loader2 className="size-4 animate-spin" /> : <ImageUp className="size-4" />}
                    {path ? "Replace photo" : "Upload photo"}
                  </Button>
                  {path && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline" disabled={busy}>
                          <Trash2 className="size-4" /> Remove
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove identity photo?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Your avatar will go back to setup required until you upload a new
                            portrait.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => void onRemove()}>
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            </div>
          </Panel>

          <Panel title="Streaming provider">
            <ProviderNotice
              message={
                provider?.configured
                  ? "Avatar streaming provider is connected. Live avatar video is available on AI-answered calls."
                  : (provider?.message ??
                    "Avatar provider not configured. Your photo and behaviour settings are saved and will be used as soon as a streaming provider is connected.")
              }
            />
          </Panel>

          <Panel
            title="Behaviour"
            hint="0 = still and minimal, 100 = highly animated."
            aside={
              <Button size="sm" onClick={() => void saveBehavior()} disabled={saving}>
                {saving && <Loader2 className="size-4 animate-spin" />} Save
              </Button>
            }
          >
            <div className="grid gap-5 sm:grid-cols-2">
              {BEHAVIOR.map(({ key, label, hint }) => (
                <Field key={key} label={label} hint={hint}>
                  <div className="flex items-center gap-3">
                    <Slider
                      value={[behavior[key] ?? 50]}
                      min={0}
                      max={100}
                      step={1}
                      aria-label={label}
                      onValueChange={([v]) =>
                        setBehavior((b) => ({ ...b, [key]: v ?? b[key] ?? 50 }))
                      }
                    />
                    <span className="w-9 text-right font-mono text-xs text-muted-foreground">
                      {behavior[key] ?? 50}
                    </span>
                  </div>
                </Field>
              ))}
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}

function readDimensions(file: File): Promise<{ width?: number; height?: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({});
    };
    img.src = url;
  });
}
