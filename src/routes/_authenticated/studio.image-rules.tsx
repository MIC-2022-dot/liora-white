import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { saveImageRule, deleteImageRule } from "@/lib/image-knowledge.functions";
import { Field, Panel, StatusPill, WorkspaceHeader } from "@/components/studio/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/studio/image-rules")({
  head: () => ({
    meta: [
      { title: "Image Rules · Liora Studio" },
      {
        name: "description",
        content: "Define how your AI selects and shares images from your library.",
      },
      { property: "og:title", content: "Image Rules · Liora Studio" },
      {
        property: "og:description",
        content: "Define how your AI selects and shares images from your library.",
      },
    ],
  }),
  component: ImageRulesWorkspace,
});

type Rule = {
  id: string;
  condition: string;
  action: "prefer" | "exclude" | "require";
  instruction: string | null;
  priority: number;
  active: boolean;
};

const ACTIONS: { value: Rule["action"]; label: string; hint: string }[] = [
  { value: "prefer", label: "prefer", hint: "Boost matching images in ranking" },
  { value: "exclude", label: "exclude", hint: "Never send matching images" },
  { value: "require", label: "require", hint: "Only send images matching this rule" },
];

const EMPTY_DRAFT = {
  condition: "",
  action: "prefer" as Rule["action"],
  instruction: "",
  priority: 0,
  active: true,
};

function ImageRulesWorkspace() {
  const { user } = useAuth();
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from("image_rules")
      .select("*")
      .eq("user_id", uid)
      .order("priority", { ascending: false });
    if (error) toast.error("Could not load image rules");
    setRules((data as Rule[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user) return;
    void load(user.id);
  }, [user, load]);

  async function save() {
    if (!user) return;
    if (!draft.condition.trim()) {
      toast.error("Condition is required");
      return;
    }
    setSaving(true);
    try {
      await saveImageRule({
        data: {
          condition: draft.condition,
          action: draft.action,
          instruction: draft.instruction.trim() || null,
          priority: draft.priority,
          active: draft.active,
        },
      });
      toast.success("Rule saved");
      setDraft(EMPTY_DRAFT);
      void load(user.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save rule");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    try {
      await deleteImageRule({ data: { ruleId: id } });
      setRules((list) => list.filter((r) => r.id !== id));
      toast.success("Rule deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete rule");
    }
  }

  return (
    <div className="space-y-6">
      <WorkspaceHeader
        eyebrow="Studio / Image Rules"
        title="Image behaviour rules"
        description="Control how your AI selects and shares images. Rules are applied on every image retrieval decision."
        status={
          loading ? null : (
            <StatusPill state={rules.length ? "ready" : "off"}>
              {rules.length} {rules.length === 1 ? "rule" : "rules"}
            </StatusPill>
          )
        }
      />

      {loading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : (
        <>
          <Panel
            title="New rule"
            hint="Rules are matched against the requested context (tags, activity, location)."
          >
            <div className="space-y-4">
              <Field
                label="condition"
                htmlFor="rule-condition"
                hint="When this context is requested, apply the rule."
              >
                <Input
                  id="rule-condition"
                  value={draft.condition}
                  onChange={(e) => setDraft((d) => ({ ...d, condition: e.target.value }))}
                  placeholder="gym, workout, beach, night, morning…"
                />
              </Field>
              <Field label="action">
                <div className="grid gap-2 sm:grid-cols-3">
                  {ACTIONS.map((a) => (
                    <button
                      key={a.value}
                      type="button"
                      onClick={() => setDraft((d) => ({ ...d, action: a.value }))}
                      className={cn(
                        "rounded-lg border px-3 py-2.5 text-left transition-colors",
                        draft.action === a.value
                          ? "border-primary bg-primary/10"
                          : "border-border hover:bg-muted/60",
                      )}
                    >
                      <span className="font-mono text-[11px] tracking-[0.14em] uppercase">
                        {a.label}
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">{a.hint}</span>
                    </button>
                  ))}
                </div>
              </Field>
              <Field
                label="instruction"
                htmlFor="rule-instruction"
                hint="Keywords to match against image metadata. Comma-separated."
              >
                <Textarea
                  id="rule-instruction"
                  rows={2}
                  value={draft.instruction}
                  onChange={(e) => setDraft((d) => ({ ...d, instruction: e.target.value }))}
                  placeholder="restaurant, dinner, night"
                />
              </Field>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Active</p>
                  <p className="text-xs text-muted-foreground">Disabled rules are ignored.</p>
                </div>
                <Switch
                  checked={draft.active}
                  onCheckedChange={(active) => setDraft((d) => ({ ...d, active }))}
                  aria-label="Rule active"
                />
              </div>
              <Button onClick={() => void save()} disabled={saving}>
                {saving && <Loader2 className="size-4 animate-spin" />} Save rule
              </Button>
            </div>
          </Panel>

          {rules.length > 0 && (
            <Panel title="Active rules" hint="Highest priority first.">
              <div className="space-y-3">
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-border p-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "rounded border px-1.5 py-0.5 font-mono text-[10px] tracking-wide uppercase",
                            rule.action === "exclude"
                              ? "border-destructive/30 bg-destructive/10 text-destructive"
                              : rule.action === "require"
                                ? "border-primary/30 bg-primary/10 text-primary"
                                : "border-border bg-muted text-muted-foreground",
                          )}
                        >
                          {rule.action}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          p{rule.priority}
                        </span>
                        {!rule.active && (
                          <span className="font-mono text-[10px] text-muted-foreground">
                            inactive
                          </span>
                        )}
                      </div>
                      <p className="mt-1.5 text-sm font-medium">{rule.condition}</p>
                      {rule.instruction && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{rule.instruction}</p>
                      )}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Delete rule"
                      onClick={() => void remove(rule.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </>
      )}
    </div>
  );
}
