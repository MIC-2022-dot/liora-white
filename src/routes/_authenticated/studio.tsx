import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Send, Sparkle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { avatarReply } from "@/lib/studio.functions";
import { EmptyState } from "@/components/liora/states";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/studio")({
  head: () => ({
    meta: [
      { title: "Studio · Liora" },
      {
        name: "description",
        content: "Configure the AI representation that can speak for you on Liora.",
      },
      { property: "og:title", content: "Studio · Liora" },
      {
        property: "og:description",
        content: "Configure the AI representation that can speak for you on Liora.",
      },
    ],
  }),
  component: Studio,
});

type Msg = { role: "user" | "assistant"; content: string };

function Studio() {
  const { user, hasStudio } = useAuth();
  const [description, setDescription] = useState("");
  const [style, setStyle] = useState("");
  const [tone, setTone] = useState("");
  const [instructions, setInstructions] = useState("");
  const [saving, setSaving] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const [{ data: p }, { data: i }] = await Promise.all([
        supabase.from("avatar_personality").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("avatar_instructions").select("*").eq("user_id", user.id).maybeSingle(),
      ]);
      setDescription(p?.description ?? "");
      setStyle(p?.speaking_style ?? "");
      setTone(p?.tone ?? "");
      setInstructions(i?.system_instructions ?? "");
    })();
  }, [user]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  if (!hasStudio) {
    return (
      <EmptyState
        icon={<Sparkle className="size-5" />}
        title="Studio is invite-only"
        body="An administrator can unlock Studio for your account. You'll get a notification the moment it's available."
      />
    );
  }

  async function save() {
    if (!user) return;
    setSaving(true);
    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabase.from("avatar_personality").upsert({
        user_id: user.id,
        description: description.trim() || null,
        speaking_style: style.trim() || null,
        tone: tone.trim() || null,
      }),
      supabase.from("avatar_instructions").upsert({
        user_id: user.id,
        system_instructions: instructions.trim() || null,
      }),
    ]);
    setSaving(false);
    if (e1 || e2) return toast.error("Could not save your Studio settings");
    toast.success("Studio updated");
  }

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
      toast.error(err instanceof Error ? err.message : "The AI could not reply");
    } finally {
      setThinking(false);
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-5xl flex-1 gap-8 px-5 py-8 lg:grid-cols-2">
      <section>
        <h1 className="font-display text-2xl">Studio</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Teach your AI representation how you speak, so it can answer for you.
        </p>

        <div className="mt-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="desc">Who you are</Label>
            <Textarea
              id="desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A calm, curious designer who loves long walks and short emails."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="style">Speaking style</Label>
            <Input
              id="style"
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              placeholder="Short sentences, dry humour, never formal."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tone">Tone</Label>
            <Input
              id="tone"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              placeholder="Warm and reassuring"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="instructions">Rules for your AI</Label>
            <Textarea
              id="instructions"
              rows={4}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Never discuss work deadlines. Always offer to take a message."
            />
          </div>
          <Button onClick={() => void save()} disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" />} Save
          </Button>
        </div>
      </section>

      <section className="flex min-h-[420px] flex-col rounded-2xl border border-border bg-card">
        <header className="border-b border-border px-4 py-3">
          <h2 className="flex items-center gap-2 text-sm font-medium">
            <Sparkle className="size-4 text-primary" /> Test your AI
          </h2>
        </header>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Say something and hear how your AI responds as you.
            </p>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={
                m.role === "user"
                  ? "ml-auto max-w-[80%] rounded-2xl rounded-br-md bg-bubble-out px-3.5 py-2 text-bubble-out-foreground"
                  : "mr-auto max-w-[80%] rounded-2xl rounded-bl-md bg-bubble-in px-3.5 py-2 text-bubble-in-foreground"
              }
            >
              <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{m.content}</p>
            </div>
          ))}
          {thinking && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
          <div ref={endRef} />
        </div>
        <div className="flex items-end gap-2 border-t border-border p-3">
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
            className="max-h-28 min-h-10 resize-none rounded-2xl"
          />
          <Button size="icon" onClick={() => void send()} disabled={thinking} aria-label="Send">
            <Send className="size-4" />
          </Button>
        </div>
      </section>
    </div>
  );
}
