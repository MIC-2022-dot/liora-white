import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Field, Panel, StatusPill, WorkspaceHeader } from "@/components/studio/ui";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/studio/instructions")({
  head: () => ({
    meta: [
      { title: "Instructions · Liora Studio" },
      {
        name: "description",
        content: "Set the operating rules, restrictions and situational behaviour of your AI.",
      },
      { property: "og:title", content: "Instructions · Liora Studio" },
      {
        property: "og:description",
        content: "Set the operating rules, restrictions and situational behaviour of your AI.",
      },
    ],
  }),
  component: InstructionsWorkspace,
});

type Form = {
  system_instructions: string;
  response_rules: string;
  restrictions: string;
  situational_behavior: string;
};

const EMPTY: Form = {
  system_instructions: "",
  response_rules: "",
  restrictions: "",
  situational_behavior: "",
};

const FIELDS: { key: keyof Form; label: string; hint: string; placeholder: string }[] = [
  {
    key: "system_instructions",
    label: "system_instructions",
    hint: "The top-level directive. Everything else is layered on top of this.",
    placeholder: "Answer as me. Take messages when you can't help. Never make promises for me.",
  },
  {
    key: "response_rules",
    label: "response_rules",
    hint: "Formatting and length rules for each reply.",
    placeholder: "Keep replies under three sentences. Always confirm names and times back.",
  },
  {
    key: "restrictions",
    label: "restrictions",
    hint: "Hard limits. The AI must refuse rather than improvise.",
    placeholder: "Never share my address, travel plans or anything about my family.",
  },
  {
    key: "situational_behavior",
    label: "situational_behavior",
    hint: "What to do in specific situations: emergencies, unknown callers, work calls.",
    placeholder: "If it's urgent, say I'll call back within the hour and take a number.",
  },
];

function InstructionsWorkspace() {
  const { user } = useAuth();
  const [form, setForm] = useState<Form>(EMPTY);
  const [initial, setInitial] = useState<Form>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const { data } = await supabase
        .from("avatar_instructions")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      const next: Form = { ...EMPTY };
      if (data) {
        for (const key of Object.keys(EMPTY) as (keyof Form)[]) {
          next[key] = (data as Record<string, string | null>)[key] ?? "";
        }
      }
      setForm(next);
      setInitial(next);
      setLoading(false);
    })();
  }, [user]);

  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  async function save() {
    if (!user) return;
    setSaving(true);
    const payload = Object.fromEntries(
      (Object.keys(form) as (keyof Form)[]).map((k) => [k, form[k].trim() || null]),
    );
    const { error } = await supabase.from("avatar_instructions").upsert({
      user_id: user.id,
      ...payload,
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) {
      toast.error("Could not save instructions");
      return;
    }
    setInitial(form);
    toast.success("Instructions saved");
  }

  return (
    <div className="space-y-6">
      <WorkspaceHeader
        eyebrow="Studio / Instructions"
        title="Agent instructions"
        description="Operating rules for your representation. These are enforced on every reply, in chat tests and on AI-answered calls."
        status={
          loading ? null : (
            <StatusPill state={initial.system_instructions.trim() ? "ready" : "off"}>
              {initial.system_instructions.trim() ? "configured" : "empty"}
            </StatusPill>
          )
        }
        actions={
          <Button onClick={() => void save()} disabled={saving || !dirty || loading}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            {dirty ? "Save changes" : "Saved"}
          </Button>
        }
      />

      {loading ? (
        <Skeleton className="h-96 w-full rounded-xl" />
      ) : (
        <div className="space-y-4">
          {FIELDS.map(({ key, label, hint, placeholder }) => (
            <Panel key={key}>
              <Field label={label} htmlFor={key} hint={hint}>
                <Textarea
                  id={key}
                  rows={4}
                  className="font-mono text-[13px] leading-relaxed"
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                />
              </Field>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
