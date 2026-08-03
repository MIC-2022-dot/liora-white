import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateGeminiText } from "@/lib/ai/gemini";

/**
 * Studio / AI server functions. Every handler re-checks Studio permission
 * server-side through the caller's own RLS-scoped client — the UI never
 * decides authorization.
 */

/** Real provider connection state for avatar streaming and voice synthesis. */
export const studioProviderStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertStudio } = await import("@/lib/studio-guard.server");
    await assertStudio(context);
    const { avatarProviderStatus } = await import("@/lib/providers/avatar.server");
    const { voiceProviderStatus } = await import("@/lib/providers/voice.server");
    const avatar = avatarProviderStatus();
    const voice = await voiceProviderStatus();
    return {
      avatar: avatar.configured
        ? { configured: true as const, provider: avatar.provider, message: "" }
        : { configured: false as const, provider: null, message: avatar.message },
      voice: voice.configured
        ? { configured: true as const, provider: voice.provider, message: "" }
        : { configured: false as const, provider: null, message: voice.message },
    };
  });

/**
 * Registers a newly uploaded identity photo as the avatar source. The image
 * itself stays in the private `studio-media` bucket; only its path is stored.
 */
export const saveAvatarSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { path: string; bytes: number; width?: number; height?: number }) => {
    if (!input?.path) throw new Error("path is required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { assertStudio } = await import("@/lib/studio-guard.server");
    await assertStudio(context);
    if (!data.path.startsWith(`${context.userId}/`)) throw new Error("Invalid upload path");
    const { analyseIdentityPhoto, avatarProviderStatus } =
      await import("@/lib/providers/avatar.server");
    const analysis = analyseIdentityPhoto({
      bytes: data.bytes,
      ...(data.width !== undefined ? { width: data.width } : {}),
      ...(data.height !== undefined ? { height: data.height } : {}),
    });
    const provider = avatarProviderStatus();

    const { error } = await context.supabase.from("avatar_profiles").upsert({
      user_id: context.userId,
      source_image_url: data.path,
      quality_score: analysis.quality_score,
      status: provider.configured ? "ready" : "source_ready",
      provider: provider.configured ? provider.provider : null,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    return analysis;
  });

/** Removes the identity photo from storage and clears the avatar profile. */
export const clearAvatarSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertStudio } = await import("@/lib/studio-guard.server");
    await assertStudio(context);
    const { data: existing } = await context.supabase
      .from("avatar_profiles")
      .select("source_image_url")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (existing?.source_image_url) {
      await context.supabase.storage.from("studio-media").remove([existing.source_image_url]);
    }
    const { error } = await context.supabase.from("avatar_profiles").upsert({
      user_id: context.userId,
      source_image_url: null,
      quality_score: null,
      status: "setup_required",
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const startAvatarCallSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { callId: string }) => {
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
  .validator((input: { callId: string }) => input)
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
  .validator((input: { text: string }) => input)
  .handler(async ({ data, context }) => {
    const { assertStudio } = await import("@/lib/studio-guard.server");
    await assertStudio(context);
    const { synthesizeSpeech, voiceProviderStatus } = await import("@/lib/providers/voice.server");
    const status = await voiceProviderStatus();
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
  .validator((input: { messages: { role: "user" | "assistant"; content: string }[] }) => {
    if (!Array.isArray(input?.messages)) throw new Error("messages is required");
    return { messages: input.messages.slice(-20) };
  })
  .handler(async ({ data, context }) => {
    const { assertStudio } = await import("@/lib/studio-guard.server");
    await assertStudio(context);
    const apiKey = process.env["GEMINI_API_KEY"];
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
      instructions?.system_instructions &&
        `Owner instructions: ${instructions.system_instructions}`,
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

    const result = await generateGeminiText({
      apiKey,
      systemInstruction: lines.join("\n"),
      messages: data.messages,
    });

    return {
      reply: result.text,
    };
  });