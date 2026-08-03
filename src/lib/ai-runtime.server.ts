/**
 * Server-only runtime for the AI representation.
 *
 * Everything the owner trains in Studio — personality, instructions, knowledge,
 * training examples and channel rules — is compiled here into the prompt that
 * drives real model calls for calls, chats and voice notes.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type Channel = "call" | "chat";
export type Delivery = "text" | "voice_note" | "spoken" | "silent";

type Client = SupabaseClient<Database>;

export function requireGatewayKey() {
  const apiKey = process.env["OPENAI_API_KEY"];
  if (!apiKey) throw new Error("AI gateway is not configured");
  return apiKey;
}

function gatewayError(status: number) {
  if (status === 401) return new Error("OpenAI authentication failed. Check your API key.");
  if (status === 429) return new Error("Rate limit reached. Try again in a moment.");
  return new Error(`OpenAI API error (${status})`);
}

/** Speech-to-text for caller audio captured during a live call. */
export async function transcribeAudio(input: {
  apiKey: string;
  audioBase64: string;
  mimeType?: string;
}) {
  const binary = atob(input.audioBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  if (bytes.length < 2048) return { text: "" };

  const mime = input.mimeType ?? "audio/wav";
  const ext = mime.includes("webm") ? "webm" : mime.includes("mp4") ? "mp4" : "wav";

  const form = new FormData();
  form.append("model", "gpt-4o-transcribe");
  form.append("file", new Blob([bytes], { type: mime }), `speech.${ext}`);

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${input.apiKey}` },
    body: form,
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    if (response.status === 429 || response.status === 402) throw gatewayError(response.status);
    throw new Error(`Transcription failed (${response.status}) ${detail.slice(0, 200)}`);
  }
  const json = (await response.json()) as { text?: string };
  return { text: (json.text ?? "").trim() };
}

/** Compiles the owner's full Studio configuration into a channel-aware prompt. */
export async function buildSystemPrompt(supabase: Client, userId: string, channel: Channel) {
  const [profile, personality, instructions, knowledge, examples, rules, chatSettings] =
    await Promise.all([
      supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle(),
      supabase.from("avatar_personality").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("avatar_instructions").select("*").eq("user_id", userId).maybeSingle(),
      supabase
        .from("avatar_knowledge")
        .select("title, category, content")
        .eq("user_id", userId)
        .limit(50),
      supabase
        .from("ai_training_examples")
        .select("scenario, user_input, ideal_response, response_format, channel, weight")
        .eq("user_id", userId)
        .eq("active", true)
        .in("channel", [channel, "both"])
        .order("weight", { ascending: false })
        .limit(60),
      supabase
        .from("ai_training_rules")
        .select("condition, action, instruction, channel, priority")
        .eq("user_id", userId)
        .eq("active", true)
        .in("channel", [channel, "both"])
        .order("priority", { ascending: false })
        .limit(40),
      supabase.from("ai_chat_settings").select("*").eq("user_id", userId).maybeSingle(),
    ]);

  const p = personality.data;
  const i = instructions.data;
  const owner = profile.data?.display_name ?? "the owner";

  const lines: (string | null | false | undefined)[] = [
    `You are the digital representation of ${owner}. You speak as ${owner}, in the first person.`,
    channel === "call"
      ? "You are on a live phone/video call. Your reply is spoken out loud, so keep it short (1-3 sentences), natural, and conversational. Never read out punctuation, lists or markdown."
      : "You are replying inside a private chat conversation. Write the way a real person texts: short, warm, human.",
    "Be emotionally present — warm, playful, serious or comforting as the moment calls for. Never describe yourself as an assistant, a bot or a language model.",
    p?.description && `Personality: ${p.description}`,
    p?.speaking_style && `Speaking style: ${p.speaking_style}`,
    p?.tone && `Tone: ${p.tone}`,
    p?.emotional_behavior && `Emotional behaviour: ${p.emotional_behavior}`,
    p?.should_know && `Things you know: ${p.should_know}`,
    p?.should_avoid && `Never do this: ${p.should_avoid}`,
    p?.conversation_preferences && `Conversation preferences: ${p.conversation_preferences}`,
    i?.system_instructions && `Owner instructions: ${i.system_instructions}`,
    i?.response_rules && `Response rules: ${i.response_rules}`,
    i?.restrictions && `Restrictions: ${i.restrictions}`,
    i?.situational_behavior && `Situational behaviour: ${i.situational_behavior}`,
    knowledge.data?.length
      ? `Knowledge base:\n${knowledge.data
          .map((k) => `- [${k.category}] ${k.title}: ${k.content}`)
          .join("\n")}`
      : null,
    examples.data?.length
      ? `Trained examples (match this voice and these decisions closely):\n${examples.data
          .map(
            (e) =>
              `- ${e.scenario ? `[${e.scenario}] ` : ""}when they say "${e.user_input}" → (${e.response_format}) "${e.ideal_response}"`,
          )
          .join("\n")}`
      : null,
    rules.data?.length
      ? `Owner rules, highest priority first:\n${rules.data
          .map(
            (r) =>
              `- if ${r.condition} → ${r.action}${r.instruction ? ` (${r.instruction})` : ""}`,
          )
          .join("\n")}`
      : null,
    channel === "chat" && chatSettings.data?.voice_notes_enabled
      ? `Voice notes are enabled. Voice note policy: ${chatSettings.data.voice_note_mode}. ${
          chatSettings.data.voice_note_instructions ??
          "Send a voice note when the moment is emotional, long-form, or when a spoken answer feels warmer than typing."
        } Keep voice notes under ${chatSettings.data.voice_note_max_seconds} seconds when spoken aloud.`
      : channel === "chat"
        ? "Voice notes are disabled — always answer with text."
        : null,
    "If you genuinely do not know something about the owner's life, say so plainly rather than inventing it.",
  ];

  return lines.filter(Boolean).join("\n");
}

export type ReplyMessage = { role: "user" | "assistant"; content: string };

/**
 * Generates the reply plus the delivery decision (text vs voice note vs
 * staying silent). The model must answer with strict JSON so the client never
 * has to guess how to deliver it.
 */
export async function generateChannelReply(input: {
  supabase: Client;
  userId: string;
  channel: Channel;
  messages: ReplyMessage[];
  apiKey: string;
}) {
  const system = await buildSystemPrompt(input.supabase, input.userId, input.channel);
  const format =
    input.channel === "call"
      ? `Respond ONLY with JSON: {"reply": string, "delivery": "spoken", "reason": string}.`
      : `Respond ONLY with JSON: {"reply": string, "delivery": "text" | "voice_note" | "silent", "reason": string}. Use "voice_note" only when your trained rules say a spoken message fits better, and "silent" only when a trained rule says not to answer.`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${input.apiKey}` },
    body: JSON.stringify({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: `${system}\n\n${format}` }, ...input.messages],
    }),
  });

  if (!response.ok) throw gatewayError(response.status);

  const json = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const raw = json.choices?.[0]?.message?.content ?? "";

  let reply = raw.trim();
  let delivery: Delivery = input.channel === "call" ? "spoken" : "text";
  let reason = "";
  try {
    const parsed = JSON.parse(raw) as { reply?: string; delivery?: Delivery; reason?: string };
    if (parsed && typeof parsed.reply === "string") {
      reply = parsed.reply.trim();
      if (parsed.delivery) delivery = parsed.delivery;
      reason = parsed.reason ?? "";
    }
  } catch {
    /* fall back to the raw text reply */
  }

  return { reply, delivery, reason };
}
