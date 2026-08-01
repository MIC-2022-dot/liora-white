import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Studio / AI server functions. Every handler re-checks Studio permission
 * server-side through the caller's own RLS-scoped client — the UI never
 * decides authorization.
 */

export const startAvatarCallSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { callId: string }) => {
    if (!input?.callId) throw new Error("callId is required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { assertStudio } = await import("@/lib/studio-guard.server");
    await assertStudio(context);
    const { openAvatarStream } = await import("@/lib/providers/avatar.server");

    const [{ data: avatar }, { data: behavior }] = await Promise.all([
      context.supabase
        .from("avatar_profiles")
        .select("source_image_url")
        .eq("user_id", context.userId)
        .maybeSingle(),
      context.supabase
        .from("avatar_behavior_settings")
        .select("*")
        .eq("user_id", context.userId)
        .maybeSingle(),
    ]);

    const handle = await openAvatarStream({
      userId: context.userId,
      sourceImageUrl: avatar?.source_image_url ?? null,
      behavior: behavior ?? null,
    });

    await context.supabase.from("ai_call_sessions").insert({
      call_id: data.callId,
      owner_id: context.userId,
      mode: "ai",
    });

    return handle;
  });

export const endAvatarCallSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { callId: string }) => input)
  .handler(async ({ data, context }) => {
    const { assertStudio } = await import("@/lib/studio-guard.server");
    await assertStudio(context);
    await context.supabase
      .from("ai_call_sessions")
      .update({ ended_at: new Date().toISOString() })
      .eq("call_id", data.callId)
      .eq("owner_id", context.userId)
      .is("ended_at", null);
    return { ok: true };
  });

export const previewVoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { text: string }) => input)
  .handler(async ({ data, context }) => {
    const { assertStudio } = await import("@/lib/studio-guard.server");
    await assertStudio(context);
    const { synthesizeSpeech, voiceProviderStatus } = await import("@/lib/providers/voice.server");
    const status = voiceProviderStatus();
    if (!status.configured) return { configured: false as const, message: status.message };
    const { data: voice } = await context.supabase
      .from("avatar_voice_settings")
      .select("voice_id, speed, pitch")
      .eq("user_id", context.userId)
      .maybeSingle();
    const audio = await synthesizeSpeech({
      text: data.text,
      voiceId: voice?.voice_id ?? null,
      speed: Number(voice?.speed ?? 1),
      pitch: Number(voice?.pitch ?? 1),
    });
    return { configured: true as const, ...audio };
  });

/**
 * Generates a reply in the owner's configured voice using the Lovable AI
 * Gateway. This is a real model call driven entirely by the owner's Studio
 * configuration — not a generic chatbot.
 */
export const avatarReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { messages: { role: "user" | "assistant"; content: string }[] }) => {
    if (!Array.isArray(input?.messages)) throw new Error("messages is required");
    return { messages: input.messages.slice(-20) };
  })
  .handler(async ({ data, context }) => {
    const { assertStudio } = await import("@/lib/studio-guard.server");
    await assertStudio(context);
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI gateway is not configured");

    const [{ data: profile }, { data: personality }, { data: instructions }, { data: knowledge }] =
      await Promise.all([
        context.supabase
          .from("profiles")
          .select("display_name")
          .eq("id", context.userId)
          .maybeSingle(),
        context.supabase
          .from("avatar_personality")
          .select("*")
          .eq("user_id", context.userId)
          .maybeSingle(),
        context.supabase
          .from("avatar_instructions")
          .select("*")
          .eq("user_id", context.userId)
          .maybeSingle(),
        context.supabase
          .from("avatar_knowledge")
          .select("title, category, content")
          .eq("user_id", context.userId)
          .limit(50),
      ]);

    const owner = profile?.display_name ?? "the owner";
    const lines = [
      `You are the digital representation of ${owner}. You speak as ${owner}, in the first person.`,
      "You are talking with someone who called or messaged them. Be natural, human and emotionally present: you can be warm, playful, serious, or comforting as the moment calls for. Never describe yourself as a generic assistant or language model.",
      "Keep replies conversational in length, as if spoken out loud.",
      personality?.description && `Personality: ${personality.description}`,
      personality?.speaking_style && `Speaking style: ${personality.speaking_style}`,
      personality?.tone && `Tone: ${personality.tone}`,
      personality?.emotional_behavior && `Emotional behaviour: ${personality.emotional_behavior}`,
      personality?.should_know && `Things you know: ${personality.should_know}`,
      personality?.should_avoid && `Never do this: ${personality.should_avoid}`,
      personality?.conversation_preferences &&
        `Conversation preferences: ${personality.conversation_preferences}`,
      instructions?.system_instructions && `Owner instructions: ${instructions.system_instructions}`,
      instructions?.response_rules && `Response rules: ${instructions.response_rules}`,
      instructions?.restrictions && `Restrictions: ${instructions.restrictions}`,
      instructions?.situational_behavior &&
        `Situational behaviour: ${instructions.situational_behavior}`,
      knowledge?.length
        ? `Knowledge base:\n${knowledge
            .map(
              (k: { title: string; category: string; content: string }) =>
                `- [${k.category}] ${k.title}: ${k.content}`,
            )
            .join("\n")}`
        : null,
      "If you genuinely do not know something about the owner's life, say so plainly rather than inventing it.",
    ].filter(Boolean);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "openai/gpt-5.6-sol",
        reasoning_effort: "none",
        messages: [{ role: "system", content: lines.join("\n") }, ...data.messages],
      }),
    });

    if (response.status === 429) throw new Error("Rate limit reached. Try again in a moment.");
    if (response.status === 402)
      throw new Error("AI credits exhausted. Add credits to keep using Studio.");
    if (!response.ok) throw new Error(`AI gateway error (${response.status})`);

    const json = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return { reply: json.choices?.[0]?.message?.content ?? "" };
  });
