import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type StudioConfig = {
  avatar: {
    status: string;
    source_image_url: string | null;
    quality_score: number | null;
    provider: string | null;
  } | null;
  behavior: Record<string, number> | null;
  personality: Record<string, string | null> | null;
  instructions: Record<string, string | null> | null;
  voice: {
    voice_id: string | null;
    voice_name: string | null;
    speed: number;
    pitch: number;
    emotion: string | null;
  } | null;
  calls: {
    enabled: boolean;
    answer_after_seconds: number;
    voice_calls: boolean;
    video_calls: boolean;
    manual_switching: boolean;
  } | null;
  knowledgeCount: number;
};

const EMPTY: StudioConfig = {
  avatar: null,
  behavior: null,
  personality: null,
  instructions: null,
  voice: null,
  calls: null,
  knowledgeCount: 0,
};

/** Loads the signed-in owner's full Studio configuration (RLS-scoped). */
export function useStudioConfig() {
  const { user } = useAuth();
  const [config, setConfig] = useState<StudioConfig>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setError(null);
    const uid = user.id;
    const [avatar, behavior, personality, instructions, voice, calls, knowledge] =
      await Promise.all([
        supabase.from("avatar_profiles").select("*").eq("user_id", uid).maybeSingle(),
        supabase.from("avatar_behavior_settings").select("*").eq("user_id", uid).maybeSingle(),
        supabase.from("avatar_personality").select("*").eq("user_id", uid).maybeSingle(),
        supabase.from("avatar_instructions").select("*").eq("user_id", uid).maybeSingle(),
        supabase.from("avatar_voice_settings").select("*").eq("user_id", uid).maybeSingle(),
        supabase.from("ai_call_settings").select("*").eq("user_id", uid).maybeSingle(),
        supabase
          .from("avatar_knowledge")
          .select("id", { count: "exact", head: true })
          .eq("user_id", uid),
      ]);

    const firstError = [avatar, behavior, personality, instructions, voice, calls].find(
      (r) => r.error,
    )?.error;
    if (firstError) setError(firstError.message);

    setConfig({
      avatar: (avatar.data as StudioConfig["avatar"]) ?? null,
      behavior: (behavior.data as StudioConfig["behavior"]) ?? null,
      personality: (personality.data as StudioConfig["personality"]) ?? null,
      instructions: (instructions.data as StudioConfig["instructions"]) ?? null,
      voice: (voice.data as StudioConfig["voice"]) ?? null,
      calls: (calls.data as StudioConfig["calls"]) ?? null,
      knowledgeCount: knowledge.count ?? 0,
    });
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    void load();
  }, [user, load]);

  return { config, loading, error, reload: load };
}

export function hasText(value: string | null | undefined) {
  return Boolean(value && value.trim().length > 0);
}

/** Derives completeness from real configuration, never hardcoded. */
export function studioCompleteness(config: StudioConfig) {
  const checks = [
    { key: "avatar", label: "Avatar", done: Boolean(config.avatar?.source_image_url) },
    {
      key: "personality",
      label: "Personality",
      done: hasText(config.personality?.["description"]) || hasText(config.personality?.["tone"]),
    },
    {
      key: "instructions",
      label: "Instructions",
      done: hasText(config.instructions?.["system_instructions"]),
    },
    { key: "knowledge", label: "Knowledge", done: config.knowledgeCount > 0 },
    { key: "voice", label: "Voice", done: Boolean(config.voice?.voice_id) },
    { key: "calls", label: "AI calls", done: Boolean(config.calls?.enabled) },
  ];
  const done = checks.filter((c) => c.done).length;
  return { checks, done, total: checks.length, percent: Math.round((done / checks.length) * 100) };
}
