/**
 * Chat autopilot.
 *
 * When the owner enables it in Studio, incoming chat messages are answered by
 * their trained AI — as text, or as a real ElevenLabs voice note when their
 * trained voice-note rules call for it.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { sendMessage } from "@/lib/chat";
import { uploadTo } from "@/lib/storage";
import { aiChannelReply } from "@/lib/ai-runtime.functions";
import { generateAiSpeech } from "@/lib/ai/elevenlabs";

export type ChatAutopilotSettings = {
  enabled: boolean;
  mode: "always" | "away" | "manual";
  away_after_minutes: number;
  reply_delay_seconds: number;
  voice_notes_enabled: boolean;
  voice_note_mode: "never" | "auto" | "always";
  voice_note_max_seconds: number;
  voice_note_instructions: string | null;
};

const ACTIVITY_EVENTS = ["pointerdown", "keydown", "visibilitychange"] as const;

export function useChatAutopilot() {
  const { user, hasStudio } = useAuth();
  const [settings, setSettings] = useState<ChatAutopilotSettings | null>(null);
  const lastActive = useRef(Date.now());
  const handled = useRef<Set<string>>(new Set());
  const settingsRef = useRef<ChatAutopilotSettings | null>(null);
  settingsRef.current = settings;

  useEffect(() => {
    if (!user || !hasStudio) {
      setSettings(null);
      return;
    }
    void supabase
      .from("ai_chat_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setSettings((data as ChatAutopilotSettings | null) ?? null));
  }, [user, hasStudio]);

  useEffect(() => {
    const mark = () => {
      if (document.visibilityState === "visible") lastActive.current = Date.now();
    };
    for (const evt of ACTIVITY_EVENTS) window.addEventListener(evt, mark);
    return () => {
      for (const evt of ACTIVITY_EVENTS) window.removeEventListener(evt, mark);
    };
  }, []);

  const respond = useCallback(
    async (conversationId: string) => {
      const s = settingsRef.current;
      if (!user || !s) return;

      const { data: history } = await supabase
        .from("messages")
        .select("sender_id, body, kind, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: false })
        .limit(12);
      if (!history?.length) return;

      const messages = [...history]
        .reverse()
        .map((m) => ({
          role: (m.sender_id === user.id ? "assistant" : "user") as "assistant" | "user",
          content:
            m.body ?? (m.kind === "audio" ? "(voice note)" : m.kind === "image" ? "(photo)" : "(attachment)"),
        }))
        .filter((m) => m.content.trim().length > 0);
      if (!messages.length) return;

      const { reply, delivery } = await aiChannelReply({ data: { channel: "chat", messages } });
      if (!reply || delivery === "silent") return;

      const wantsVoice =
        s.voice_notes_enabled &&
        s.voice_note_mode !== "never" &&
        (s.voice_note_mode === "always" || delivery === "voice_note");

      if (wantsVoice) {
        try {
          const { blob } = await generateAiSpeech(reply);
          const path = `${conversationId}/${user.id}-ai-${Date.now()}.mp3`;
          await uploadTo("chat-media", path, blob);
          await sendMessage({
            conversationId,
            senderId: user.id,
            kind: "audio",
            mediaUrl: path,
            mediaMeta: { ai: true, transcript: reply, type: "audio/mpeg" },
          });
          return;
        } catch {
          /* voice synthesis failed — fall back to text so the reply still lands */
        }
      }

      await sendMessage({ conversationId, senderId: user.id, body: reply, kind: "text" });
    },
    [user],
  );

  useEffect(() => {
    if (!user || !settings?.enabled || settings.mode === "manual") return;

    const channel = supabase
      .channel(`chat-autopilot:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        ({ new: row }) => {
          const message = row as { id: string; conversation_id: string; sender_id: string };
          if (!message?.id || message.sender_id === user.id) return;
          if (handled.current.has(message.id)) return;
          handled.current.add(message.id);

          void (async () => {
            const { data: member } = await supabase
              .from("conversation_participants")
              .select("conversation_id")
              .eq("conversation_id", message.conversation_id)
              .eq("user_id", user.id)
              .maybeSingle();
            if (!member) return;

            const s = settingsRef.current;
            if (!s?.enabled) return;
            if (s.mode === "away") {
              const idleMs = Date.now() - lastActive.current;
              if (document.visibilityState === "visible" && idleMs < s.away_after_minutes * 60000)
                return;
            }

            await new Promise((r) => setTimeout(r, Math.max(0, s.reply_delay_seconds) * 1000));
            try {
              await respond(message.conversation_id);
            } catch {
              /* a failed autopilot turn must never break the app */
            }
          })();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, settings, respond]);

  return { settings };
}
