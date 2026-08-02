import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Play } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { listElevenLabsVoices } from "@/lib/ai/elevenlabs";
import { previewVoice, studioProviderStatus } from "@/lib/studio.functions";
import { EMOTIONS } from "@/lib/voice-catalog";
import { Field, Panel, ProviderNotice, StatusPill, WorkspaceHeader } from "@/components/studio/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/studio/voice")({
  head: () => ({
    meta: [
      { title: "Voice · Liora Studio" },
      {
        name: "description",
        content: "Choose the voice, speed and pitch your AI representation speaks with.",
      },
      { property: "og:title", content: "Voice · Liora Studio" },
      {
        property: "og:description",
        content: "Choose the voice, speed and pitch your AI representation speaks with.",
      },
    ],
  }),
  component: VoiceWorkspace,
});

type ElevenLabsVoiceOption = {
  id: string;
  name: string;
  category?: string | null;
  description?: string | null;
};

function VoiceWorkspace() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceId, setVoiceId] = useState<string | null>(null);
  const [speed, setSpeed] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [emotion, setEmotion] = useState("neutral");
  const [sample, setSample] = useState("Hey, it's me — I can't pick up right now, but I'm here.");
  const [provider, setProvider] = useState<{ configured: boolean; message: string } | null>(null);
  const [availableVoices, setAvailableVoices] = useState<ElevenLabsVoiceOption[]>([]);

  useEffect(() => {
    if (!user) return;

    void (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("avatar_voice_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setVoiceId(data.voice_id);
        setSpeed(Number(data.speed ?? 1));
        setPitch(Number(data.pitch ?? 1));
        setEmotion(data.emotion ?? "neutral");
      }
      setLoading(false);
    })();

    void studioProviderStatus()
      .then((s) => setProvider({ configured: s.voice.configured, message: s.voice.message }))
      .catch(() => setProvider(null));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setVoiceLoading(true);
    setVoiceError(null);
    void listElevenLabsVoices()
      .then((voices) => {
        setAvailableVoices(voices);
      })
      .catch((err) => {
        setVoiceError(err instanceof Error ? err.message : "Could not load voices");
      })
      .finally(() => setVoiceLoading(false));
  }, [user]);

  async function save() {
    if (!user) return;
    setSaving(true);

    const selected = availableVoices.find((v) => v.id === voiceId);
    const { error } = await supabase.from("avatar_voice_settings").upsert({
      user_id: user.id,
      voice_id: voiceId,
      voice_name: selected?.name ?? null,
      speed,
      pitch,
      emotion,
      updated_at: new Date().toISOString(),
    });

    setSaving(false);
    if (error) toast.error("Could not save voice settings");
    else toast.success("Voice settings saved");
  }

  async function preview() {
    setPreviewing(true);
    try {
      const res = await previewVoice({ data: { text: sample } });
      if (!res.configured) {
        toast.info("Voice provider not configured", { description: res.message });
        return;
      }
      const audio = new Audio(`data:${res.mimeType};base64,${res.audioBase64}`);
      await audio.play();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Preview failed");
    } finally {
      setPreviewing(false);
    }
  }

  const voiceOptions = availableVoices.length > 0 ? availableVoices : [];

  return (
    <div className="space-y-6">
      <WorkspaceHeader
        eyebrow="Studio / Voice"
        title="Voice"
        description="The voice your representation uses on AI-answered calls. Settings save even before a provider is connected."
        status={
          loading ? null : (
            <StatusPill state={voiceId ? (provider?.configured ? "ready" : "pending") : "off"}>
              {voiceId ? (provider?.configured ? "ready" : "saved") : "not selected"}
            </StatusPill>
          )
        }
        actions={
          <Button onClick={() => void save()} disabled={saving || loading || voiceLoading}>
            {saving && <Loader2 className="size-4 animate-spin" />} Save
          </Button>
        }
      />

      {loading ? (
        <Skeleton className="h-72 w-full rounded-xl" />
      ) : (
        <>
          <Panel title="Provider">
            <ProviderNotice
              message={
                provider?.configured
                  ? "Voice provider connected. Previews and spoken AI calls are available."
                  : (provider?.message ??
                    "Voice provider not configured. You can still choose and save a voice profile; playback becomes available once credentials are added.")
              }
            />
          </Panel>

          <Panel
            title="ElevenLabs voices"
            hint="Browse available ElevenLabs voices and choose the one you want your AI to speak with."
          >
            {voiceLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-14 w-full rounded-xl" />
                <Skeleton className="h-14 w-full rounded-xl" />
                <Skeleton className="h-14 w-full rounded-xl" />
              </div>
            ) : voiceError ? (
              <p className="text-sm text-muted-foreground">{voiceError}</p>
            ) : voiceOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No ElevenLabs voices are available. If your ElevenLabs provider is connected, try
                refreshing the page.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {voiceOptions.map((voice) => (
                  <button
                    key={voice.id}
                    type="button"
                    onClick={() => setVoiceId(voice.id)}
                    aria-pressed={voiceId === voice.id}
                    className={cn(
                      "rounded-lg border px-4 py-3 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      voiceId === voice.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40",
                    )}
                  >
                    <p className="text-sm font-medium">{voice.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {voice.category ?? voice.description ?? "ElevenLabs voice"}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Delivery">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="speed" hint={`${speed.toFixed(2)}x`}>
                <Slider
                  value={[speed]}
                  min={0.5}
                  max={1.5}
                  step={0.05}
                  aria-label="Speaking speed"
                  onValueChange={([v]) => setSpeed(v ?? 1)}
                />
              </Field>
              <Field label="pitch" hint={`${pitch.toFixed(2)}x`}>
                <Slider
                  value={[pitch]}
                  min={0.5}
                  max={1.5}
                  step={0.05}
                  aria-label="Pitch"
                  onValueChange={([v]) => setPitch(v ?? 1)}
                />
              </Field>
              <Field label="emotion" hint="Baseline delivery colour.">
                <Select value={emotion} onValueChange={setEmotion}>
                  <SelectTrigger aria-label="Emotion">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EMOTIONS.map((e) => (
                      <SelectItem key={e} value={e}>
                        {e}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </Panel>

          <Panel title="Preview">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <Field label="sample_text" htmlFor="sample">
                  <Input
                    id="sample"
                    value={sample}
                    onChange={(e) => setSample(e.target.value)}
                    maxLength={200}
                  />
                </Field>
              </div>
              <Button
                variant="outline"
                onClick={() => void preview()}
                disabled={previewing || !sample.trim()}
              >
                {previewing ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Play className="size-4" />
                )}
                Play preview
              </Button>
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}
