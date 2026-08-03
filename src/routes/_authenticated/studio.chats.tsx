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
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/studio/chats")({
  head: () => ({
    meta: [
      { title: "Chat autopilot · Liora Studio" },
      {
        name: "description",
        content:
          "Decide when your AI answers chats for you and when it replies with a spoken voice note.",
      },
      { property: "og:title", content: "Chat autopilot · Liora Studio" },
      {
        property: "og:description",
        content:
          "Decide when your AI answers chats for you and when it replies with a spoken voice note.",
      },
    ],
  }),
  component: ChatAutopilotWorkspace,
});

type Settings = {
  enabled: boolean;
  mode: "always" | "away" | "manual";
  away_after_minutes: number;
  reply_delay_seconds: number;
  voice_notes_enabled: boolean;
  voice_note_mode: "never" | "auto" | "always";
  voice_note_max_seconds: number;
  voice_note_instructions: string;
};

const DEFAULTS: Settings = {
  enabled: false,
  mode: "away",
  away_after_minutes: 5,
  reply_delay_seconds: 2,
  voice_notes_enabled: false,
  voice_note_mode: "auto",
  voice_note_max_seconds: 45,
  voice_note_instructions: "",
};

const MODES: { value: Settings["mode"]; label: string; hint: string }[] = [
  { value: "away", label: "away", hint: "Replies only while you are idle or the tab is hidden" },
  { value: "always", label: "always", hint: "Replies to every incoming message immediately" },
  { value: "manual", label: "manual", hint: "Never replies on its own" },
];

const VOICE_MODES: { value: Settings["voice_note_mode"]; label: string; hint: string }[] = [
  { value: "never", label: "never", hint: "Text only" },
  { value: "auto", label: "auto", hint: "Your trained rules decide per message" },
  { value: "always", label: "always", hint: "Every autopilot reply is spoken" },
];

function ChatAutopilotWorkspace() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const { data } = await supabase
        .from("ai_chat_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setSettings({
          enabled: data.enabled,
          mode: data.mode as Settings["mode"],
          away_after_minutes: data.away_after_minutes,
          reply_delay_seconds: data.reply_delay_seconds,
          voice_notes_enabled: data.voice_notes_enabled,
          voice_note_mode: data.voice_note_mode as Settings["voice_note_mode"],
          voice_note_max_seconds: data.voice_note_max_seconds,
          voice_note_instructions: data.voice_note_instructions ?? "",
        });
      }
      setLoading(false);
    })();
  }, [user]);

  async function save() {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("ai_chat_settings").upsert({
      user_id: user.id,
      ...settings,
      voice_note_instructions: settings.voice_note_instructions.trim() || null,
    });
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Chat autopilot updated");
  }

  const patch = (next: Partial<Settings>) => setSettings((s) => ({ ...s, ...next }));

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <WorkspaceHeader
        eyebrow="runtime / chat"
        title="Chat autopilot"
        description="Let your AI carry conversations while you're away, and decide when it answers with a spoken voice note instead of text."
        status={
          <StatusPill state={settings.enabled ? "ready" : "off"}>
            {settings.enabled ? `mode: ${settings.mode}` : "disabled"}
          </StatusPill>
        }
        actions={
          <Button onClick={() => void save()} disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" />} Save
          </Button>
        }
      />

      <Panel title="Autopilot" hint="Your AI replies with your trained voice, never a generic bot.">
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Answer chats for me</p>
              <p className="text-xs text-muted-foreground">
                Incoming messages are answered from your personality, instructions, knowledge and
                training set.
              </p>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(enabled) => patch({ enabled })}
              aria-label="Enable chat autopilot"
            />
          </div>

          <Field label="Trigger" hint="When the AI is allowed to answer on your behalf.">
            <div className="grid gap-2 sm:grid-cols-3">
              {MODES.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => patch({ mode: m.value })}
                  className={cn(
                    "rounded-lg border px-3 py-2.5 text-left transition-colors",
                    settings.mode === m.value
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-muted/60",
                  )}
                >
                  <span className="font-mono text-[11px] tracking-[0.14em] uppercase">
                    {m.label}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">{m.hint}</span>
                </button>
              ))}
            </div>
          </Field>

          {settings.mode === "away" && (
            <Field
              label={`Idle threshold — ${settings.away_after_minutes} min`}
              hint="How long you must be inactive before the AI steps in."
            >
              <Slider
                min={1}
                max={60}
                step={1}
                value={[settings.away_after_minutes]}
                onValueChange={([v]) => patch({ away_after_minutes: v ?? 5 })}
              />
            </Field>
          )}

          <Field
            label={`Reply delay — ${settings.reply_delay_seconds}s`}
            hint="A small human pause before your AI answers."
          >
            <Slider
              min={0}
              max={30}
              step={1}
              value={[settings.reply_delay_seconds]}
              onValueChange={([v]) => patch({ reply_delay_seconds: v ?? 0 })}
            />
          </Field>
        </div>
      </Panel>

      <Panel title="Voice notes" hint="Spoken replies rendered in your cloned voice.">
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Allow voice notes</p>
              <p className="text-xs text-muted-foreground">
                Your AI can answer with real audio instead of typing.
              </p>
            </div>
            <Switch
              checked={settings.voice_notes_enabled}
              onCheckedChange={(voice_notes_enabled) => patch({ voice_notes_enabled })}
              aria-label="Allow voice notes"
            />
          </div>

          <Field label="Voice note policy">
            <div className="grid gap-2 sm:grid-cols-3">
              {VOICE_MODES.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  disabled={!settings.voice_notes_enabled}
                  onClick={() => patch({ voice_note_mode: m.value })}
                  className={cn(
                    "rounded-lg border px-3 py-2.5 text-left transition-colors disabled:opacity-50",
                    settings.voice_note_mode === m.value
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-muted/60",
                  )}
                >
                  <span className="font-mono text-[11px] tracking-[0.14em] uppercase">
                    {m.label}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">{m.hint}</span>
                </button>
              ))}
            </div>
          </Field>

          <Field
            label={`Max length — ${settings.voice_note_max_seconds}s`}
            hint="Your AI keeps spoken replies inside this budget."
          >
            <Slider
              min={10}
              max={120}
              step={5}
              value={[settings.voice_note_max_seconds]}
              onValueChange={([v]) => patch({ voice_note_max_seconds: v ?? 45 })}
            />
          </Field>

          <Field
            label="When to send a voice note"
            hint="Plain-language policy compiled into every autopilot decision."
          >
            <Textarea
              rows={4}
              value={settings.voice_note_instructions}
              onChange={(e) => patch({ voice_note_instructions: e.target.value })}
              placeholder="Send a voice note when someone sounds upset, when I'm explaining something long, or when they sent a voice note first. Keep it text for quick logistics."
            />
          </Field>
        </div>
      </Panel>
    </div>
  );
}
