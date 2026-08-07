/**
 * Server-only runtime for the AI representation.
 *
 * Everything the owner trains in Studio — personality, instructions, knowledge,
 * training examples and channel rules — is compiled here into the prompt that
 * drives real model calls for calls, chats and voice notes.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { generateGeminiText, transcribeGeminiAudio } from "@/lib/ai/gemini";

export type Channel = "call" | "chat";
export type Delivery = "text" | "voice_note" | "spoken" | "silent";
export type ChannelReply = {
  reply: string;
  delivery: Delivery;
  reason: string;
  imageRequest?: boolean;
  imageTags?: string[];
};

type Client = SupabaseClient<Database>;

export function requireGatewayKey() {
  const apiKey = process.env["GEMINI_API_KEY"];
  if (!apiKey) throw new Error("AI gateway is not configured");
  return apiKey;
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

  try {
    return transcribeGeminiAudio({
      apiKey: input.apiKey,
      audioBase64: input.audioBase64,
      mimeType: mime,
    });
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error("Transcription failed.");
  }
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
            (r) => `- if ${r.condition} → ${r.action}${r.instruction ? ` (${r.instruction})` : ""}`,
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
    channel === "chat"
      ? `Image sharing is available. When the user explicitly asks you to send, show, or share a picture, photo, or selfie of you or your surroundings, set "imageRequest": true and extract the requested visual context into "imageTags" as lowercase, concise tags (e.g. "room", "bedroom", "home", "indoors", "gym", "workout", "beach", "selfie"). Keep the reply short and natural, like "Sure 😊". Do not invent reasons why an image cannot be sent, and do not claim an image was sent — the application will attach the actual image. Never invent personal circumstances such as "my room is messy" unless that information exists in the owner's actual knowledge.`
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
      : `Respond ONLY with JSON: {"reply": string, "delivery": "text" | "voice_note" | "silent", "reason": string, "imageRequest": boolean, "imageTags": string[]}. Use "voice_note" only when your trained rules say a spoken message fits better, and "silent" only when a trained rule says not to answer. Set "imageRequest" to true only when the user explicitly asks for a picture, photo, or selfie. When "imageRequest" is true, provide "imageTags" as lowercase, concise tags describing the requested visual context.`;

  const result = await generateGeminiText({
    apiKey: input.apiKey,
    systemInstruction: `${system}\n\n${format}`,
    messages: input.messages,
  });

  const raw = result.text;

  let reply = raw.trim();
  let delivery: Delivery = input.channel === "call" ? "spoken" : "text";
  let reason = "";
  let imageRequest = false;
  let imageTags: string[] = [];
  try {
    const parsed = JSON.parse(raw) as {
      reply?: string;
      delivery?: Delivery;
      reason?: string;
      imageRequest?: boolean;
      imageTags?: unknown;
    };
    if (parsed && typeof parsed.reply === "string") {
      reply = parsed.reply.trim();
      if (parsed.delivery) delivery = parsed.delivery;
      reason = parsed.reason ?? "";
      if (typeof parsed.imageRequest === "boolean") imageRequest = parsed.imageRequest;
      if (Array.isArray(parsed.imageTags)) {
        imageTags = parsed.imageTags
          .filter((t): t is string => typeof t === "string")
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean);
      }
    }
  } catch {
    /* fall back to the raw text reply */
  }

  return { reply, delivery, reason, imageRequest, imageTags };
}
