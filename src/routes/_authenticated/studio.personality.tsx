import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Field, Panel, StatusPill, WorkspaceHeader } from "@/components/studio/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/studio/personality")({
  head: () => ({
    meta: [
      { title: "Personality · Liora Studio" },
      {
        name: "description",
        content: "Define how your AI representation speaks, feels and reacts on your behalf.",
      },
      { property: "og:title", content: "Personality · Liora Studio" },
      {
        property: "og:description",
        content: "Define how your AI representation speaks, feels and reacts on your behalf.",
      },
    ],
  }),
  component: PersonalityWorkspace,
});

type Form = {
  description: string;
  speaking_style: string;
  tone: string;
  emotional_behavior: string;
  should_know: string;
  should_avoid: string;
  conversation_preferences: string;
};

const EMPTY: Form = {
  description: "",
  speaking_style: "",
  tone: "",
  emotional_behavior: "",
  should_know: "",
  should_avoid: "",
  conversation_preferences: "",
};

function PersonalityWorkspace() {
  const { user } = useAuth();
  const [form, setForm] = useState<Form>(EMPTY);
  const [initial, setInitial] = useState<Form>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const { data } = await supabase
        .from("avatar_personality")
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
  const set = (key: keyof Form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  async function save() {
    if (!user) return;
    setSaving(true);
    const payload = Object.fromEntries(
      (Object.keys(form) as (keyof Form)[]).map((k) => [k, form[k].trim() || null]),
    );
    const { error } = await supabase.from("avatar_personality").upsert({
      user_id: user.id,
      ...payload,
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) {
      toast.error("Could not save personality");
      return;
    }
    setInitial(form);
    toast.success("Personality saved");
  }

  const configured = Boolean(initial.description.trim() || initial.tone.trim());

  return (
    <div className="space-y-6">
      <WorkspaceHeader
        eyebrow="Studio / Personality"
        title="Personality"
        description="This is the character your AI adopts. It is injected into every reply your representation gives."
        status={
          loading ? null : (
            <StatusPill state={configured ? "ready" : "off"}>
              {configured ? "configured" : "empty"}
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
        <>
          <Panel title="Identity">
            <div className="space-y-5">
              <Field
                label="description"
                htmlFor="description"
                hint="Who you are, in a few sentences. Written as if describing yourself."
              >
                <Textarea
                  id="description"
                  rows={4}
                  value={form.description}
                  onChange={(e) => set("description")(e.target.value)}
                  placeholder="A calm, curious designer who loves long walks and short emails."
                />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="speaking_style" htmlFor="style" hint="Sentence length, humour, slang.">
                  <Input
                    id="style"
                    value={form.speaking_style}
                    onChange={(e) => set("speaking_style")(e.target.value)}
                    placeholder="Short sentences, dry humour, never formal."
                  />
                </Field>
                <Field label="tone" htmlFor="tone" hint="The default emotional colour of replies.">
                  <Input
                    id="tone"
                    value={form.tone}
                    onChange={(e) => set("tone")(e.target.value)}
                    placeholder="Warm and reassuring"
                  />
                </Field>
              </div>
            </div>
          </Panel>

          <Panel title="Behaviour">
            <div className="space-y-5">
              <Field
                label="emotional_behavior"
                htmlFor="emotion"
                hint="How your AI reacts to good news, bad news and tension."
              >
                <Textarea
                  id="emotion"
                  rows={3}
                  value={form.emotional_behavior}
                  onChange={(e) => set("emotional_behavior")(e.target.value)}
                  placeholder="Stays steady under pressure, celebrates other people's wins loudly."
                />
              </Field>
              <Field
                label="conversation_preferences"
                htmlFor="prefs"
                hint="Preferred subjects, pacing and how conversations should end."
              >
                <Textarea
                  id="prefs"
                  rows={3}
                  value={form.conversation_preferences}
                  onChange={(e) => set("conversation_preferences")(e.target.value)}
                  placeholder="Asks a question back. Keeps calls short unless it's family."
                />
              </Field>
            </div>
          </Panel>

          <Panel title="Boundaries">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="should_know" htmlFor="know" hint="Facts it may freely share.">
                <Textarea
                  id="know"
                  rows={4}
                  value={form.should_know}
                  onChange={(e) => set("should_know")(e.target.value)}
                  placeholder="My general schedule, my city, my work in broad terms."
                />
              </Field>
              <Field label="should_avoid" htmlFor="avoid" hint="Hard boundaries it must respect.">
                <Textarea
                  id="avoid"
                  rows={4}
                  value={form.should_avoid}
                  onChange={(e) => set("should_avoid")(e.target.value)}
                  placeholder="Never discuss finances, health details or my exact address."
                />
              </Field>
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}
