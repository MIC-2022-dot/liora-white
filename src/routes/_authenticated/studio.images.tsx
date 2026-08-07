import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ImageUp, Loader2, Pencil, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { uploadTo, fileExt } from "@/lib/storage";
import { useSignedUrl } from "@/hooks/use-signed-url";
import {
  uploadLibraryImage,
  updateLibraryImage,
  deleteLibraryImage,
  analyzeLibraryImage,
} from "@/lib/image-knowledge.functions";
import { Field, Panel, StatusPill, WorkspaceHeader } from "@/components/studio/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

export const Route = createFileRoute("/_authenticated/studio/images")({
  head: () => ({
    meta: [
      { title: "Image Library · Liora Studio" },
      {
        name: "description",
        content: "Upload, organise and control the images your AI can share.",
      },
      { property: "og:title", content: "Image Library · Liora Studio" },
      {
        property: "og:description",
        content: "Upload, organise and control the images your AI can share.",
      },
    ],
  }),
  component: ImageLibraryWorkspace,
});

type LibraryImage = {
  id: string;
  storage_path: string;
  title: string | null;
  description: string | null;
  tags: string[];
  activity: string | null;
  location_context: string | null;
  time_context: "morning" | "afternoon" | "evening" | "night" | "anytime";
  image_state: "current" | "historical" | "reference";
  ai_enabled: boolean;
  priority: number;
  reuse_policy: "never" | "after_days" | "always";
  reuse_after_days: number | null;
  metadata_reviewed: boolean;
  created_at: string;
};

const TIME_CONTEXTS = ["morning", "afternoon", "evening", "night", "anytime"] as const;
const IMAGE_STATES = ["current", "historical", "reference"] as const;
const REUSE_POLICIES = ["never", "after_days", "always"] as const;

type Draft = {
  id?: string;
  title: string;
  description: string;
  tags: string;
  activity: string;
  location_context: string;
  time_context: (typeof TIME_CONTEXTS)[number];
  image_state: (typeof IMAGE_STATES)[number];
  ai_enabled: boolean;
  priority: number;
  reuse_policy: (typeof REUSE_POLICIES)[number];
  reuse_after_days: number;
};

const EMPTY_DRAFT: Draft = {
  title: "",
  description: "",
  tags: "",
  activity: "",
  location_context: "",
  time_context: "anytime",
  image_state: "historical",
  ai_enabled: true,
  priority: 0,
  reuse_policy: "never",
  reuse_after_days: 7,
};

function ImageLibraryWorkspace() {
  const { user } = useAuth();
  const [images, setImages] = useState<LibraryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [editing, setEditing] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from("image_library")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    if (error) toast.error("Could not load image library");
    setImages((data as LibraryImage[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user) return;
    void load(user.id);
  }, [user, load]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return images.filter((img) => {
      if (filter === "ai" && !img.ai_enabled) return false;
      if (filter === "current" && img.image_state !== "current") return false;
      if (filter === "historical" && img.image_state !== "historical") return false;
      if (filter === "reference" && img.image_state !== "reference") return false;
      if (!q) return true;
      const haystack = [img.title, img.description, img.activity, img.location_context, ...img.tags]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [images, query, filter]);

  async function onUpload(file: File) {
    if (!user) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Upload an image file");
      return;
    }
    setUploading(true);
    try {
      const path = `${user.id}/library-${Date.now()}.${fileExt(file, "jpg")}`;
      await uploadTo("studio-media", path, file);
      await uploadLibraryImage({ data: { storagePath: path } });
      toast.success("Image uploaded");
      void load(user.id);

      // Optionally analyze the image for suggested metadata.
      setAnalyzing(true);
      try {
        const { suggested } = await analyzeLibraryImage({ data: { storagePath: path } });
        if (suggested) {
          const { data: created } = await supabase
            .from("image_library")
            .select("id")
            .eq("user_id", user.id)
            .eq("storage_path", path)
            .maybeSingle();
          if (created) {
            setEditing({
              ...EMPTY_DRAFT,
              id: created.id,
              title: suggested.title,
              description: suggested.description,
              tags: suggested.tags.join(", "),
              activity: suggested.activity,
              location_context: suggested.location_context,
              time_context: suggested.time_context,
              image_state: suggested.image_state,
            });
            toast.success("AI suggested metadata — review and save");
          }
        }
      } catch {
        /* AI analysis is optional */
      } finally {
        setAnalyzing(false);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function openEdit(img: LibraryImage) {
    setEditing({
      id: img.id,
      title: img.title ?? "",
      description: img.description ?? "",
      tags: img.tags.join(", "),
      activity: img.activity ?? "",
      location_context: img.location_context ?? "",
      time_context: img.time_context,
      image_state: img.image_state,
      ai_enabled: img.ai_enabled,
      priority: img.priority,
      reuse_policy: img.reuse_policy,
      reuse_after_days: img.reuse_after_days ?? 7,
    });
  }

  async function save() {
    if (!user || !editing) return;
    setSaving(true);
    const tags = editing.tags
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    const payload = {
      imageId: editing.id!,
      title: editing.title.trim() || null,
      description: editing.description.trim() || null,
      tags,
      activity: editing.activity.trim() || null,
      locationContext: editing.location_context.trim() || null,
      timeContext: editing.time_context,
      imageState: editing.image_state,
      aiEnabled: editing.ai_enabled,
      priority: editing.priority,
      reusePolicy: editing.reuse_policy,
      reuseAfterDays: editing.reuse_policy === "after_days" ? editing.reuse_after_days : null,
      metadataReviewed: true,
    };

    try {
      await updateLibraryImage({ data: payload });
      toast.success("Image updated");
      setEditing(null);
      void load(user.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save image");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    try {
      await deleteLibraryImage({ data: { imageId: id } });
      setImages((list) => list.filter((i) => i.id !== id));
      toast.success("Image deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete image");
    }
  }

  return (
    <div className="space-y-6">
      <WorkspaceHeader
        eyebrow="Studio / Image Library"
        title="Image knowledge"
        description="Upload the images your AI can share. Tag them, set context, and control exactly when they're used."
        status={
          loading ? null : (
            <StatusPill state={images.length ? "ready" : "off"}>
              {images.length} {images.length === 1 ? "image" : "images"}
            </StatusPill>
          )
        }
        actions={
          <>
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
            <Button onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ImageUp className="size-4" />
              )}
              {uploading ? "Uploading…" : "Upload image"}
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search titles, tags, activities…"
            className="pl-9"
            aria-label="Search images"
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="sm:w-48" aria-label="Filter images">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All images</SelectItem>
            <SelectItem value="ai">AI enabled</SelectItem>
            <SelectItem value="current">Current state</SelectItem>
            <SelectItem value="historical">Historical</SelectItem>
            <SelectItem value="reference">Reference</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-56 w-full rounded-xl" />
          <Skeleton className="h-56 w-full rounded-xl" />
          <Skeleton className="h-56 w-full rounded-xl" />
        </div>
      ) : visible.length === 0 ? (
        <Panel>
          <div className="py-8 text-center">
            <p className="text-sm font-medium">
              {images.length === 0 ? "No images yet" : "No images match your filters"}
            </p>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              {images.length === 0
                ? "Upload photos your AI can share when someone asks for a picture."
                : "Try a different search term or filter."}
            </p>
            {images.length === 0 && (
              <Button className="mt-4" onClick={() => fileRef.current?.click()}>
                <ImageUp className="size-4" /> Upload your first image
              </Button>
            )}
          </div>
        </Panel>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((img) => (
            <LibraryCard
              key={img.id}
              image={img}
              onEdit={() => openEdit(img)}
              onDelete={() => void remove(img.id)}
            />
          ))}
        </div>
      )}

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit image" : "New image"}</DialogTitle>
            <DialogDescription>
              {editing?.id
                ? "Review and refine the metadata your AI uses to match this image."
                : "Add metadata for this image."}
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <Field label="title" htmlFor="img-title">
                <Input
                  id="img-title"
                  value={editing.title}
                  onChange={(e) => setEditing((s) => ({ ...s!, title: e.target.value }))}
                  placeholder="Dinner at the harbour"
                />
              </Field>
              <Field label="description" htmlFor="img-desc">
                <Textarea
                  id="img-desc"
                  rows={3}
                  value={editing.description}
                  onChange={(e) => setEditing((s) => ({ ...s!, description: e.target.value }))}
                  placeholder="A photo of me at the seafood restaurant by the water."
                />
              </Field>
              <Field
                label="tags"
                htmlFor="img-tags"
                hint="Comma-separated. e.g. restaurant, dinner, night"
              >
                <Input
                  id="img-tags"
                  value={editing.tags}
                  onChange={(e) => setEditing((s) => ({ ...s!, tags: e.target.value }))}
                  placeholder="restaurant, dinner, night, food"
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="activity" htmlFor="img-activity">
                  <Input
                    id="img-activity"
                    value={editing.activity}
                    onChange={(e) => setEditing((s) => ({ ...s!, activity: e.target.value }))}
                    placeholder="dinner"
                  />
                </Field>
                <Field label="location / context" htmlFor="img-location">
                  <Input
                    id="img-location"
                    value={editing.location_context}
                    onChange={(e) =>
                      setEditing((s) => ({ ...s!, location_context: e.target.value }))
                    }
                    placeholder="restaurant"
                  />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="time of day">
                  <Select
                    value={editing.time_context}
                    onValueChange={(v) =>
                      setEditing((s) => ({ ...s!, time_context: v as Draft["time_context"] }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_CONTEXTS.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="image state">
                  <Select
                    value={editing.image_state}
                    onValueChange={(v) =>
                      setEditing((s) => ({ ...s!, image_state: v as Draft["image_state"] }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {IMAGE_STATES.map((st) => (
                        <SelectItem key={st} value={st}>
                          {st}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="reuse policy">
                  <Select
                    value={editing.reuse_policy}
                    onValueChange={(v) =>
                      setEditing((s) => ({ ...s!, reuse_policy: v as Draft["reuse_policy"] }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REUSE_POLICIES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r === "never"
                            ? "Never reuse"
                            : r === "after_days"
                              ? "Reuse after days"
                              : "Always reuse"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                {editing.reuse_policy === "after_days" && (
                  <Field label={`Reuse after — ${editing.reuse_after_days} days`}>
                    <Slider
                      min={1}
                      max={90}
                      step={1}
                      value={[editing.reuse_after_days]}
                      onValueChange={([v]) =>
                        setEditing((s) => ({ ...s!, reuse_after_days: v ?? 7 }))
                      }
                    />
                  </Field>
                )}
              </div>
              <Field
                label={`Priority — ${editing.priority}`}
                hint="Higher priority images are preferred when multiple match."
              >
                <Slider
                  min={0}
                  max={10}
                  step={1}
                  value={[editing.priority]}
                  onValueChange={([v]) => setEditing((s) => ({ ...s!, priority: v ?? 0 }))}
                />
              </Field>
              <div className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Allow AI to send this image</p>
                  <p className="text-xs text-muted-foreground">
                    When off, the AI will never share this image.
                  </p>
                </div>
                <Switch
                  checked={editing.ai_enabled}
                  onCheckedChange={(ai_enabled) => setEditing((s) => ({ ...s!, ai_enabled }))}
                  aria-label="Allow AI to send this image"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={() => void save()} disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />} Save image
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LibraryCard({
  image,
  onEdit,
  onDelete,
}: {
  image: LibraryImage;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const url = useSignedUrl("studio-media", image.storage_path);

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/40">
      <div className="relative aspect-[4/3] bg-muted">
        {url ? (
          <img src={url} alt={image.title ?? "Library image"} className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        )}
        <div className="absolute top-2 right-2 flex gap-1">
          {!image.ai_enabled && (
            <span className="rounded-md bg-destructive/90 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              AI off
            </span>
          )}
          <span className="rounded-md bg-black/60 px-1.5 py-0.5 font-mono text-[10px] tracking-wide text-white uppercase">
            {image.image_state}
          </span>
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold">{image.title ?? "Untitled"}</h3>
            {image.activity && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {image.activity}
                {image.location_context ? ` · ${image.location_context}` : ""}
              </p>
            )}
          </div>
          <div className="flex shrink-0 gap-1">
            <Button size="icon" variant="ghost" aria-label="Edit image" onClick={onEdit}>
              <Pencil className="size-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="icon" variant="ghost" aria-label="Delete image">
                  <Trash2 className="size-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this image?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes the image from your library and storage. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        {image.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {image.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
              >
                {tag}
              </span>
            ))}
            {image.tags.length > 4 && (
              <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                +{image.tags.length - 4}
              </span>
            )}
          </div>
        )}
        <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="font-mono uppercase">{image.time_context}</span>
          <span>·</span>
          <span>priority {image.priority}</span>
        </div>
      </div>
    </article>
  );
}
