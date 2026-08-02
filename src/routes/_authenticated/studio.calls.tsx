import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Field, Panel, StatusPill, WorkspaceHeader } from "@/components/studio/ui";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/studio/calls")({
  head: () => ({
    meta: [
      { title: "AI calls · Liora Studio" },
      {
        name: "description",
        content: "Control when your AI answers calls for you and how you can switch mid-call.",
      },
      { property: "og:title", content: "AI calls · Liora Studio" },
      {
        property: "og:description",
        content: "Control when your AI answers calls for you and how you can switch mid-call.",
      },
    ],
  }),
  component: CallsWorkspace,
});

type Settings = {
  enabled: boolean;
  answer_after_seconds: number;
  voice_calls: boolean;
  video_calls: boolean;
  manual_switching: boolean;
};

const DEFAULTS: Settings = {
  enabled: false,
  answer_after_seconds: 10,
  voice_calls: true,
  video_calls: true,
  manual_switching: true,
};

function CallsWorkspace() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [initial, setInitial] = useState<Settings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const { data } = await supabase
        .from("ai_call_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      const next: Settings = data
        ? {
            enabled: data.enabled,
            answer_after_seconds: data.answer_after_seconds,
            voice_calls: data.voice_calls,
            video_calls: data.video_calls,
            manual_switching: data.manual_switching,
          }
        : DEFAULTS;
      setSettings(next);
      setInitial(next);
      setLoading(false);
    })();
  }, [user]);

  const dirty = JSON.stringify(settings) !== JSON.stringify(initial);

  async function save() {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("ai_call_settings").upsert({
      user_id: user.id,
      ...settings,
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) {
      toast.error("Could not save AI call settings");
      return;
    }
    setInitial(settings);
    toast.success("AI call settings saved");
  }

  const toggles: { key: keyof Settings; label: string; hint: string }[] = [
    {
      key: "enabled",
      label: "AI answering",
      hint: "Master switch. When off, calls always ring for you only.",
    },
    { key: "voice_calls", label: "Voice calls", hint: "Allow the AI to answer voice calls." },
    { key: "video_calls", label: "Video calls", hint: "Allow the AI to answer video calls." },
    {
      key: "manual_switching",
      label: "Manual switching",
      hint: "Show the switch control during an active call so you can hand over in either direction.",
    },
  ];

  return (
    <div className="space-y-6">
      <WorkspaceHeader
        eyebrow="Studio / AI Calls"
        title="AI calling"
        description="These settings apply immediately to incoming Liora calls. Switching mid-call keeps the existing connection alive."
        status={
          loading ? null : (
            <StatusPill state={initial.enabled ? "ready" : "off"}>
              {initial.enabled ? "enabled" : "disabled"}
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
        <Skeleton className="h-72 w-full rounded-xl" />
      ) : (
        <>
          <Panel title="Live status">
            <dl className="grid gap-3 sm:grid-cols-2">
              {toggles.map(({ key, label }) => (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                >
                  <dt className="font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
                    {label}
                  </dt>
                  <dd>
                    <StatusPill state={initial[key] ? "ready" : "off"}>
                      {initial[key] ? "enabled" : "disabled"}
                    </StatusPill>
                  </dd>
                </div>
              ))}
            </dl>
          </Panel>

          <Panel title="Configuration">
            <div className="space-y-1">
              {toggles.map(({ key, label, hint }) => (
                <div
                  key={key}
                  className="flex items-start justify-between gap-6 border-b border-border py-4 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
                  </div>
                  <Switch
                    checked={Boolean(settings[key])}
                    aria-label={label}
                    disabled={key !== "enabled" && !settings.enabled}
                    onCheckedChange={(v) => setSettings((s) => ({ ...s, [key]: v }))}
                  />
                </div>
              ))}
            </div>

            <div className="pt-5">
              <Field
                label="answer_after_seconds"
                hint={`Your AI picks up after ${settings.answer_after_seconds} seconds of ringing if you don't.`}
              >
                <div className="flex items-center gap-3">
                  <Slider
                    value={[settings.answer_after_seconds]}
                    min={0}
                    max={60}
                    step={1}
                    disabled={!settings.enabled}
                    aria-label="Answer delay in seconds"
                    onValueChange={([v]) =>
                      setSettings((s) => ({ ...s, answer_after_seconds: v ?? s.answer_after_seconds }))
                    }
                  />
                  <span className="w-12 text-right font-mono text-xs text-muted-foreground">
                    {settings.answer_after_seconds}s
                  </span>
                </div>
              </Field>
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}
