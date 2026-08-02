import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Field, Panel, StatusPill, WorkspaceHeader } from "@/components/studio/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
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

export const Route = createFileRoute("/_authenticated/studio/knowledge")({
  head: () => ({
    meta: [
      { title: "Knowledge · Liora Studio" },
      {
        name: "description",
        content: "Organise what your AI representation knows about your life, work and people.",
      },
      { property: "og:title", content: "Knowledge · Liora Studio" },
      {
        property: "og:description",
        content: "Organise what your AI representation knows about your life, work and people.",
      },
    ],
  }),
  component: KnowledgeWorkspace,
});

const CATEGORIES = ["general", "work", "personal", "people", "schedule", "preferences"] as const;

type Entry = {
  id: string;
  title: string;
  category: string;
  content: string;
  updated_at: string;
};

function KnowledgeWorkspace() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [editing, setEditing] = useState<Partial<Entry> | null>(null);
  const [saving, setSaving] = useState(false);

  async function load(uid: string) {
    const { data, error } = await supabase
      .from("avatar_knowledge")
      .select("id, title, category, content, updated_at")
      .eq("user_id", uid)
      .order("updated_at", { ascending: false });
    if (error) toast.error("Could not load knowledge entries");
    setEntries((data as Entry[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (!user) return;
    void load(user.id);
  }, [user]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter(
      (e) =>
        (filter === "all" || e.category === filter) &&
        (!q || e.title.toLowerCase().includes(q) || e.content.toLowerCase().includes(q)),
    );
  }, [entries, query, filter]);

  async function save() {
    if (!user || !editing) return;
    const title = (editing.title ?? "").trim();
    const content = (editing.content ?? "").trim();
    if (!title || !content) {
      toast.error("Title and content are both required");
      return;
    }
    setSaving(true);
    const payload = {
      user_id: user.id,
      title,
      content,
      category: editing.category ?? "general",
      updated_at: new Date().toISOString(),
    };
    const { error } = editing.id
      ? await supabase
          .from("avatar_knowledge")
          .update(payload)
          .eq("id", editing.id)
          .eq("user_id", user.id)
      : await supabase.from("avatar_knowledge").insert(payload);
    setSaving(false);
    if (error) {
      toast.error("Could not save the entry");
      return;
    }
    setEditing(null);
    toast.success(editing.id ? "Entry updated" : "Entry created");
    void load(user.id);
  }

  async function remove(id: string) {
    if (!user) return;
    const { error } = await supabase
      .from("avatar_knowledge")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) {
      toast.error("Could not delete the entry");
      return;
    }
    setEntries((list) => list.filter((e) => e.id !== id));
    toast.success("Entry deleted");
  }

  return (
    <div className="space-y-6">
      <WorkspaceHeader
        eyebrow="Studio / Knowledge"
        title="Knowledge base"
        description="Facts your representation can draw on. Up to 50 entries are supplied to the model on every reply."
        status={
          loading ? null : (
            <StatusPill state={entries.length ? "ready" : "off"}>
              {entries.length} {entries.length === 1 ? "entry" : "entries"}
            </StatusPill>
          )
        }
        actions={
          <Button onClick={() => setEditing({ category: "general" })}>
            <Plus className="size-4" /> New entry
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search titles and content"
            className="pl-9"
            aria-label="Search knowledge"
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="sm:w-48" aria-label="Filter by category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      ) : visible.length === 0 ? (
        <Panel>
          <div className="py-8 text-center">
            <p className="text-sm font-medium">
              {entries.length === 0 ? "No knowledge yet" : "No entries match your filters"}
            </p>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              {entries.length === 0
                ? "Add what your AI should know: your routine, your work, the people around you."
                : "Try a different search term or category."}
            </p>
            {entries.length === 0 && (
              <Button className="mt-4" onClick={() => setEditing({ category: "general" })}>
                <Plus className="size-4" /> Add your first entry
              </Button>
            )}
          </div>
        </Panel>
      ) : (
        <div className="space-y-3">
          {visible.map((e) => (
            <article
              key={e.id}
              className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-sm font-semibold">{e.title}</h3>
                    <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
                      {e.category}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-3 text-sm whitespace-pre-wrap text-muted-foreground">
                    {e.content}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Edit ${e.title}`}
                    onClick={() => setEditing(e)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Delete ${e.title}`}
                    onClick={() => void remove(e.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit entry" : "New knowledge entry"}</DialogTitle>
            <DialogDescription>
              Write it the way you would explain it to someone answering your phone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Field label="title" htmlFor="k-title">
              <Input
                id="k-title"
                value={editing?.title ?? ""}
                onChange={(e) => setEditing((s) => ({ ...s, title: e.target.value }))}
                placeholder="My weekly schedule"
              />
            </Field>
            <Field label="category" htmlFor="k-cat">
              <Select
                value={editing?.category ?? "general"}
                onValueChange={(v) => setEditing((s) => ({ ...s, category: v }))}
              >
                <SelectTrigger id="k-cat">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="content" htmlFor="k-content">
              <Textarea
                id="k-content"
                rows={6}
                value={editing?.content ?? ""}
                onChange={(e) => setEditing((s) => ({ ...s, content: e.target.value }))}
                placeholder="Mondays and Wednesdays are studio days — I don't take calls before 2pm."
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={() => void save()} disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />} Save entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
