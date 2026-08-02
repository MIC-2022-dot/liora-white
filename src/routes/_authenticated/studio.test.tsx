import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2, Lock, Play, RotateCcw, Send } from "lucide-react";
import { toast } from "sonner";
import { avatarReply, previewVoice, studioProviderStatus } from "@/lib/studio.functions";
import { useStudioConfig } from "@/hooks/use-studio-config";
import { useSignedUrl } from "@/hooks/use-signed-url";
import { Panel, ProviderNotice, StatusPill, WorkspaceHeader } from "@/components/studio/ui";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/studio/test")({
  head: () => ({
    meta: [
      { title: "Test · Liora Studio" },
      {
        name: "description",
        content: "Privately test how your AI representation answers before letting it speak for you.",
      },
      { property: "og:title", content: "Test · Liora Studio" },
      {
        property: "og:description",
        content: "Privately test how your AI representation answers before letting it speak for you.",
      },
    ],
  }),
  component: TestWorkspace,
});

type Msg = { role: "user" | "assistant"; content: string };

function TestWorkspace() {
  const { config, loading } = useStudioConfig();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const [speaking, setSpeaking] = useState<number | null>(null);
  const [providers, setProviders] = useState<{
    avatar: { configured: boolean; message: string };
    voice: { configured: boolean; message: string };
  } | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const avatarPreview = useSignedUrl("studio-media", config.avatar?.source_image_url);

  useEffect(() => {
    void studioProviderStatus()
      .then((s) =>
        setProviders({
          avatar: { configured: s.avatar.configured, message: s.avatar.message },
          voice: { configured: s.voice.configured, message: s.voice.message },
        }),
      )
      .catch(() => setProviders(null));
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  async function send() {
    const content = draft.trim();
    if (!content || thinking) return;
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setDraft("");
    setThinking(true);
    try {
      const res = await avatarReply({ data: { messages: next } });
      setMessages([...next, { role: "assistant", content: res.reply }]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Your AI could not reply");
    } finally {
      setThinking(false);
    }
  }

  async function speak(index: number, text: string) {
    setSpeaking(index);
    try {
      const res = await previewVoice({ data: { text } });
      if (!res.configured) {
        toast.info("Voice provider not configured", { description: res.message });
        return;
      }
      await new Audio(`data:${res.mimeType};base64,${res.audioBase64}`).play();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Playback failed");
    } finally {
      setSpeaking(null);
    }
  }

  const configured =
    Boolean(config.personality?.["description"]) ||
    Boolean(config.instructions?.["system_instructions"]);

  return (
    <div className="space-y-6">
      <WorkspaceHeader
        eyebrow="Studio / Test"
        title="Private test bench"
        description="Talk to your own representation. It uses your personality, instructions and knowledge base — exactly what a caller would get."
        status={
          loading ? null : (
            <StatusPill state={configured ? "ready" : "pending"}>
              {configured ? "using your config" : "defaults only"}
            </StatusPill>
          )
        }
        actions={
          <Button variant="outline" onClick={() => setMessages([])} disabled={!messages.length}>
            <RotateCcw className="size-4" /> Reset
          </Button>
        }
      />

      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <Lock className="size-3.5" /> This conversation is private to your Studio. Nothing here is
        sent to your contacts.
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
        <Panel title="Conversation" className="flex min-h-[440px] flex-col">
          <div className="flex min-h-[300px] flex-1 flex-col gap-3 overflow-y-auto">
            {messages.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {configured
                  ? "Say something and hear how your AI answers as you."
                  : "Your personality and instructions are still empty — replies will be generic until you configure them."}
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "self-end" : "self-start"}>
                <div
                  className={
                    m.role === "user"
                      ? "max-w-[42ch] rounded-2xl rounded-br-md bg-bubble-out px-3.5 py-2 text-bubble-out-foreground"
                      : "max-w-[52ch] rounded-2xl rounded-bl-md bg-bubble-in px-3.5 py-2 text-bubble-in-foreground"
                  }
                >
                  <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{m.content}</p>
                </div>
                {m.role === "assistant" && (
                  <button
                    type="button"
                    onClick={() => void speak(i, m.content)}
                    className="mt-1 inline-flex items-center gap-1 font-mono text-[10px] tracking-wide text-muted-foreground uppercase hover:text-foreground"
                  >
                    {speaking === i ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Play className="size-3" />
                    )}
                    speak
                  </button>
                )}
              </div>
            ))}
            {thinking && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
            <div ref={endRef} />
          </div>

          <div className="mt-4 flex items-end gap-2 border-t border-border pt-4">
            <Textarea
              rows={1}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              placeholder="Message your AI"
              aria-label="Message your AI"
              className="max-h-28 min-h-10 resize-none rounded-xl"
            />
            <Button
              size="icon"
              onClick={() => void send()}
              disabled={thinking || !draft.trim()}
              aria-label="Send"
            >
              <Send className="size-4" />
            </Button>
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel title="Avatar preview">
            <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Your avatar identity source"
                  className="size-full object-cover"
                />
              ) : (
                <p className="px-4 text-center text-xs text-muted-foreground">
                  No identity photo yet.{" "}
                  <Link to="/studio/avatar" className="underline">
                    Upload one
                  </Link>
                </p>
              )}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {providers?.avatar.configured
                ? "Streaming provider connected — live animated preview is available on calls."
                : "Static identity preview. Animated avatar requires a streaming provider."}
            </p>
          </Panel>

          <Panel title="Voice">
            <ProviderNotice
              message={
                providers?.voice.configured
                  ? `Voice ready: ${config.voice?.voice_name ?? "no profile selected"}.`
                  : (providers?.voice.message ??
                    "Voice provider not configured. Text replies still reflect your full configuration.")
              }
            />
          </Panel>
        </div>
      </div>
    </div>
  );
}
