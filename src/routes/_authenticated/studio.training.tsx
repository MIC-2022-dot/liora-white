import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Braces, Download, Loader2, Plus, Trash2, Upload, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { aiChannelReply } from "@/lib/ai-runtime.functions";
import { Field, Panel, StatusPill, WorkspaceHeader } from "@/components/studio/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/studio/training")({
  head: () => ({
    meta: [
      { title: "Training · Liora Studio" },
      {
        name: "description",
        content:
          "Train your AI on what to say in calls and chats, and teach it exactly when to send a voice note.",
      },
      { property: "og:title", content: "Training · Liora Studio" },
      {
        property: "og:description",
        content:
          "Train your AI on what to say in calls and chats, and teach it exactly when to send a voice note.",
      },
    ],
  }),
  component: TrainingWorkspace,
});

type Channel = "call" | "chat" | "both";
type ResponseFormat = "text" | "voice_note" | "spoken";
type RuleAction = "reply_text" | "send_voice_note" | "stay_silent" | "escalate";

type Example = {
  id: string;
  channel: Channel;
  scenario: string | null;
  user_input: string;
  ideal_response: string;
  response_format: ResponseFormat;
  weight: number;
  active: boolean;
};

type Rule = {
  id: string;
  channel: Channel;
  condition: string;
  action: RuleAction;
  instruction: string | null;
  priority: number;
  active: boolean;
};

const CHANNELS: Channel[] = ["call", "chat", "both"];
const FORMATS: ResponseFormat[] = ["text", "voice_note", "spoken"];
const ACTIONS: RuleAction[] = ["reply_text", "send_voice_note", "stay_silent", "escalate"];

const EMPTY_DRAFT = {
  channel: "chat" as Channel,
  scenario: "",
  user_input: "",
  ideal_response: "",
  response_format: "text" as ResponseFormat,
  weight: 1,
};

const EMPTY_RULE = {
  channel: "chat" as Channel,
  condition: "",
  action: "reply_text" as RuleAction,
  instruction: "",
  priority: 0,
};

function Chips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={cn(
            "rounded-md border px-2.5 py-1 font-mono text-[11px] tracking-wide uppercase transition-colors",
            value === option
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:bg-muted/60",
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

function TrainingWorkspace() {
  const { user } = useAuth();
  const [examples, setExamples] = useState<Example[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Channel | "all">("all");
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [ruleDraft, setRuleDraft] = useState(EMPTY_RULE);
  const [saving, setSaving] = useState(false);
  const [evaluating, setEvaluating] = useState<string | null>(null);
  const [evaluations, setEvaluations] = useState<
    Record<string, { reply: string; delivery: string; reason: string }>
  >({});
  const importRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const [ex, rl] = await Promise.all([
      supabase
        .from("ai_training_examples")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("ai_training_rules")
        .select("*")
        .eq("user_id", user.id)
        .order("priority", { ascending: false }),
    ]);
    setExamples((ex.data ?? []) as Example[]);
    setRules((rl.data ?? []) as Rule[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(
    () => (filter === "all" ? examples : examples.filter((e) => e.channel === filter)),
    [examples, filter],
  );

  const stats = useMemo(() => {
    const active = examples.filter((e) => e.active);
    return {
      total: examples.length,
      active: active.length,
      call: active.filter((e) => e.channel !== "chat").length,
      chat: active.filter((e) => e.channel !== "call").length,
      voice: active.filter((e) => e.response_format === "voice_note").length,
      rules: rules.filter((r) => r.active).length,
    };
  }, [examples, rules]);

  async function addExample() {
    if (!user) return;
    if (!draft.user_input.trim() || !draft.ideal_response.trim()) {
      toast.error("An example needs an input and an ideal response");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("ai_training_examples").insert({
      user_id: user.id,
      channel: draft.channel,
      scenario: draft.scenario.trim() || null,
      user_input: draft.user_input.trim(),
      ideal_response: draft.ideal_response.trim(),
      response_format: draft.response_format,
      weight: draft.weight,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setDraft({ ...EMPTY_DRAFT, channel: draft.channel });
    await load();
  }

  async function toggleExample(example: Example) {
    setExamples((list) => list.map((e) => (e.id === example.id ? { ...e, active: !e.active } : e)));
    const { error } = await supabase
      .from("ai_training_examples")
      .update({ active: !example.active })
      .eq("id", example.id);
    if (error) toast.error(error.message);
  }

  async function removeExample(id: string) {
    setExamples((list) => list.filter((e) => e.id !== id));
    const { error } = await supabase.from("ai_training_examples").delete().eq("id", id);
    if (error) toast.error(error.message);
  }

  async function addRule() {
    if (!user) return;
    if (!ruleDraft.condition.trim()) {
      toast.error("A rule needs a condition");
      return;
    }
    const { error } = await supabase.from("ai_training_rules").insert({
      user_id: user.id,
      channel: ruleDraft.channel,
      condition: ruleDraft.condition.trim(),
      action: ruleDraft.action,
      instruction: ruleDraft.instruction.trim() || null,
      priority: ruleDraft.priority,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setRuleDraft({ ...EMPTY_RULE, channel: ruleDraft.channel });
    await load();
  }

  async function removeRule(id: string) {
    setRules((list) => list.filter((r) => r.id !== id));
    const { error } = await supabase.from("ai_training_rules").delete().eq("id", id);
    if (error) toast.error(error.message);
  }

  async function evaluate(example: Example) {
    setEvaluating(example.id);
    try {
      const res = await aiChannelReply({
        data: {
          channel: example.channel === "call" ? "call" : "chat",
          messages: [{ role: "user", content: example.user_input }],
        },
      });
      setEvaluations((map) => ({ ...map, [example.id]: res }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Evaluation failed");
    } finally {
      setEvaluating(null);
    }
  }

  function exportJsonl() {
    const lines = examples.map((e) =>
      JSON.stringify({
        channel: e.channel,
        scenario: e.scenario,
        input: e.user_input,
        output: e.ideal_response,
        format: e.response_format,
        weight: e.weight,
      }),
    );
    const blob = new Blob([lines.join("\n")], { type: "application/jsonl" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "liora-training.jsonl";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importJsonl(file: File) {
    if (!user) return;
    const text = await file.text();
    const rows: Record<string, unknown>[] = [];
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        rows.push(JSON.parse(trimmed) as Record<string, unknown>);
      } catch {
        /* skip malformed lines instead of dropping the whole import */
      }
    }
    const payload = rows
      .map((row) => ({
        user_id: user.id,
        channel: CHANNELS.includes(row["channel"] as Channel)
          ? (row["channel"] as Channel)
          : ("chat" as Channel),
        scenario: (row["scenario"] as string) ?? null,
        user_input: String(row["input"] ?? row["user_input"] ?? "").trim(),
        ideal_response: String(row["output"] ?? row["ideal_response"] ?? "").trim(),
        response_format: FORMATS.includes(row["format"] as ResponseFormat)
          ? (row["format"] as ResponseFormat)
          : ("text" as ResponseFormat),
        weight: Number(row["weight"] ?? 1) || 1,
      }))
      .filter((r) => r.user_input && r.ideal_response);

    if (!payload.length) {
      toast.error("No usable rows found in that file");
      return;
    }
    const { error } = await supabase.from("ai_training_examples").insert(payload);
    if (error) toast.error(error.message);
    else {
      toast.success(`Imported ${payload.length} examples`);
      await load();
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <WorkspaceHeader
        eyebrow="model / training"
        title="Training bench"
        description="Teach your AI what to say on calls and in chats, and exactly when a spoken voice note beats typing. Every row is compiled into the live prompt."
        status={
          <StatusPill state={stats.active ? "ready" : "off"}>{stats.active} active</StatusPill>
        }
        actions={
          <>
            <input
              ref={importRef}
              type="file"
              accept=".jsonl,.json,.txt"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void importJsonl(file);
                e.target.value = "";
              }}
            />
            <Button variant="outline" onClick={() => importRef.current?.click()}>
              <Upload className="size-4" /> Import
            </Button>
            <Button variant="outline" onClick={exportJsonl} disabled={!examples.length}>
              <Download className="size-4" /> Export
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: "dataset", value: stats.total },
          { label: "active", value: stats.active },
          { label: "call", value: stats.call },
          { label: "chat", value: stats.chat },
          { label: "voice-note", value: stats.voice },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-card px-4 py-3">
            <p className="font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
              {s.label}
            </p>
            <p className="mt-1 font-display text-xl">{s.value}</p>
          </div>
        ))}
      </div>

      <Panel
        title="New training pair"
        hint="input → ideal response, exactly the way you would answer it yourself."
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Channel">
              <Chips
                options={CHANNELS}
                value={draft.channel}
                onChange={(channel) => setDraft((d) => ({ ...d, channel }))}
              />
            </Field>
            <Field label="Delivery">
              <Chips
                options={FORMATS}
                value={draft.response_format}
                onChange={(response_format) => setDraft((d) => ({ ...d, response_format }))}
              />
            </Field>
          </div>

          <Field label="Scenario tag" hint="Optional label, e.g. work-hours, family, sales.">
            <Input
              value={draft.scenario}
              onChange={(e) => setDraft((d) => ({ ...d, scenario: e.target.value }))}
              placeholder="late-night check-in"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="They say">
              <Textarea
                rows={3}
                value={draft.user_input}
                onChange={(e) => setDraft((d) => ({ ...d, user_input: e.target.value }))}
                placeholder="Hey, are you free to talk right now?"
              />
            </Field>
            <Field label="You would answer">
              <Textarea
                rows={3}
                value={draft.ideal_response}
                onChange={(e) => setDraft((d) => ({ ...d, ideal_response: e.target.value }))}
                placeholder="I'm in the middle of something — give me twenty minutes and I'll call you."
              />
            </Field>
          </div>

          <div className="flex items-end justify-between gap-3">
            <Field label={`Weight — ${draft.weight}`}>
              <Input
                type="number"
                min={0.1}
                max={5}
                step={0.1}
                value={draft.weight}
                onChange={(e) => setDraft((d) => ({ ...d, weight: Number(e.target.value) || 1 }))}
                className="w-28"
              />
            </Field>
            <Button onClick={() => void addExample()} disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Add to dataset
            </Button>
          </div>
        </div>
      </Panel>

      <Panel
        title="Dataset"
        hint="Toggle rows in or out of the live prompt, or run them against the current model."
        aside={
          <div className="flex gap-1.5">
            {(["all", ...CHANNELS] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setFilter(c)}
                className={cn(
                  "rounded-md border px-2 py-1 font-mono text-[11px] uppercase",
                  filter === c
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-muted/60",
                )}
              >
                {c}
              </button>
            ))}
          </div>
        }
      >
        {visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No examples yet. Add a few real conversations and your AI will start sounding like you.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {visible.map((example) => {
              const evaluation = evaluations[example.id];
              return (
                <li key={example.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase">
                          {example.channel}
                        </span>
                        <span className="rounded-md border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase">
                          {example.response_format}
                        </span>
                        {example.scenario && (
                          <span className="font-mono text-[10px] text-muted-foreground">
                            #{example.scenario}
                          </span>
                        )}
                        <span className="font-mono text-[10px] text-muted-foreground">
                          w{example.weight}
                        </span>
                      </div>
                      <p className="text-sm">
                        <span className="text-muted-foreground">in →</span> {example.user_input}
                      </p>
                      <p className="text-sm">
                        <span className="text-muted-foreground">out →</span> {example.ideal_response}
                      </p>
                      {evaluation && (
                        <div className="mt-2 rounded-lg border border-dashed border-border bg-muted/40 p-3 text-xs">
                          <p className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                            model output · {evaluation.delivery}
                          </p>
                          <p className="mt-1 text-sm">{evaluation.reply}</p>
                          {evaluation.reason && (
                            <p className="mt-1 text-muted-foreground">{evaluation.reason}</p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Switch
                        checked={example.active}
                        onCheckedChange={() => void toggleExample(example)}
                        aria-label="Include in prompt"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => void evaluate(example)}
                        disabled={evaluating === example.id}
                        aria-label="Run against model"
                      >
                        {evaluating === example.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Wand2 className="size-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => void removeExample(example.id)}
                        aria-label="Delete example"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <Panel
        title="Decision rules"
        hint="Highest priority first — these decide voice note vs text, and when to stay quiet."
        aside={<StatusPill state={stats.rules ? "ready" : "off"}>{stats.rules} active</StatusPill>}
      >
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Channel">
              <Chips
                options={CHANNELS}
                value={ruleDraft.channel}
                onChange={(channel) => setRuleDraft((r) => ({ ...r, channel }))}
              />
            </Field>
            <Field label="Action">
              <Chips
                options={ACTIONS}
                value={ruleDraft.action}
                onChange={(action) => setRuleDraft((r) => ({ ...r, action }))}
              />
            </Field>
          </div>
          <Field label="Condition" hint="Written the way you'd explain it to a person.">
            <Input
              value={ruleDraft.condition}
              onChange={(e) => setRuleDraft((r) => ({ ...r, condition: e.target.value }))}
              placeholder="they send a voice note or sound emotional"
            />
          </Field>
          <Field label="Instruction">
            <Textarea
              rows={2}
              value={ruleDraft.instruction}
              onChange={(e) => setRuleDraft((r) => ({ ...r, instruction: e.target.value }))}
              placeholder="Answer with a warm voice note, under 30 seconds."
            />
          </Field>
          <div className="flex items-end justify-between gap-3">
            <Field label="Priority">
              <Input
                type="number"
                value={ruleDraft.priority}
                onChange={(e) =>
                  setRuleDraft((r) => ({ ...r, priority: Number(e.target.value) || 0 }))
                }
                className="w-28"
              />
            </Field>
            <Button variant="outline" onClick={() => void addRule()}>
              <Braces className="size-4" /> Add rule
            </Button>
          </div>

          {rules.length > 0 && (
            <ul className="divide-y divide-border border-t border-border pt-2">
              {rules.map((rule) => (
                <li key={rule.id} className="flex items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="font-mono text-[11px] text-muted-foreground uppercase">
                      p{rule.priority} · {rule.channel} · {rule.action}
                    </p>
                    <p className="mt-1 text-sm">if {rule.condition}</p>
                    {rule.instruction && (
                      <p className="text-xs text-muted-foreground">{rule.instruction}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => void removeRule(rule.id)}
                    aria-label="Delete rule"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Panel>
    </div>
  );
}
