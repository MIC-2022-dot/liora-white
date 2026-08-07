/**
 * Server functions for the Studio Image Library.
 *
 * Every handler re-checks Studio permission server-side through the caller's
 * own RLS-scoped client — the UI never decides authorization.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateGeminiText } from "@/lib/ai/gemini";
import type { Database } from "@/integrations/supabase/types";

type ImageLibraryUpdate = Database["public"]["Tables"]["image_library"]["Update"];
type ImageLibraryInsert = Database["public"]["Tables"]["image_library"]["Insert"];

export type ImageSuggestion = {
  title: string;
  description: string;
  tags: string[];
  activity: string;
  location_context: string;
  time_context: "morning" | "afternoon" | "evening" | "night" | "anytime";
  image_state: "current" | "historical" | "reference";
  people: number;
  mood: string;
};

/** Uploads an image to the user's private studio-media bucket and registers it in the library. */
export const uploadLibraryImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (input: {
      storagePath: string;
      title?: string | null;
      description?: string | null;
      tags?: string[];
      activity?: string | null;
      locationContext?: string | null;
      timeContext?: "morning" | "afternoon" | "evening" | "night" | "anytime";
      imageState?: "current" | "historical" | "reference";
      aiEnabled?: boolean;
      priority?: number;
      reusePolicy?: "never" | "after_days" | "always";
      reuseAfterDays?: number | null;
    }) => {
      if (!input?.storagePath) throw new Error("storagePath is required");
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    const { assertStudio } = await import("@/lib/studio-guard.server");
    await assertStudio(context);
    if (!data.storagePath.startsWith(`${context.userId}/`)) throw new Error("Invalid upload path");

    const row: ImageLibraryInsert = {
      user_id: context.userId,
      storage_path: data.storagePath,
      title: data.title ?? null,
      description: data.description ?? null,
      tags: data.tags ?? [],
      activity: data.activity ?? null,
      location_context: data.locationContext ?? null,
      time_context: data.timeContext ?? "anytime",
      image_state: data.imageState ?? "historical",
      ai_enabled: data.aiEnabled ?? true,
      priority: data.priority ?? 0,
      reuse_policy: data.reusePolicy ?? "never",
      reuse_after_days: data.reuseAfterDays ?? null,
    };

    const { error } = await context.supabase.from("image_library").insert(row);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Updates image metadata. Only the owner can modify their own images. */
export const updateLibraryImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (input: {
      imageId: string;
      title?: string | null;
      description?: string | null;
      tags?: string[];
      activity?: string | null;
      locationContext?: string | null;
      timeContext?: "morning" | "afternoon" | "evening" | "night" | "anytime";
      imageState?: "current" | "historical" | "reference";
      aiEnabled?: boolean;
      priority?: number;
      reusePolicy?: "never" | "after_days" | "always";
      reuseAfterDays?: number | null;
      metadataReviewed?: boolean;
    }) => {
      if (!input?.imageId) throw new Error("imageId is required");
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    const { assertStudio } = await import("@/lib/studio-guard.server");
    await assertStudio(context);

    const patch: ImageLibraryUpdate = { updated_at: new Date().toISOString() };
    if (data.title !== undefined) patch.title = data.title;
    if (data.description !== undefined) patch.description = data.description;
    if (data.tags !== undefined) patch.tags = data.tags;
    if (data.activity !== undefined) patch.activity = data.activity;
    if (data.locationContext !== undefined) patch.location_context = data.locationContext;
    if (data.timeContext !== undefined) patch.time_context = data.timeContext;
    if (data.imageState !== undefined) patch.image_state = data.imageState;
    if (data.aiEnabled !== undefined) patch.ai_enabled = data.aiEnabled;
    if (data.priority !== undefined) patch.priority = data.priority;
    if (data.reusePolicy !== undefined) patch.reuse_policy = data.reusePolicy;
    if (data.reuseAfterDays !== undefined) patch.reuse_after_days = data.reuseAfterDays;
    if (data.metadataReviewed !== undefined) patch.metadata_reviewed = data.metadataReviewed;

    const { error } = await context.supabase
      .from("image_library")
      .update(patch)
      .eq("id", data.imageId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Deletes an image from the library and its storage object. */
export const deleteLibraryImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { imageId: string }) => {
    if (!input?.imageId) throw new Error("imageId is required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { assertStudio } = await import("@/lib/studio-guard.server");
    await assertStudio(context);

    const { data: image } = await context.supabase
      .from("image_library")
      .select("storage_path")
      .eq("id", data.imageId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!image) throw new Error("Image not found");

    // Remove from storage first, then delete the record.
    await context.supabase.storage.from("studio-media").remove([image.storage_path]);
    const { error } = await context.supabase
      .from("image_library")
      .delete()
      .eq("id", data.imageId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Optionally generates suggested metadata for an uploaded image using Gemini.
 * The result is a suggestion only — the Studio user reviews and edits it.
 * Never fails the upload if AI analysis fails.
 */
export const analyzeLibraryImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { storagePath: string }) => {
    if (!input?.storagePath) throw new Error("storagePath is required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { assertStudio } = await import("@/lib/studio-guard.server");
    await assertStudio(context);
    if (!data.storagePath.startsWith(`${context.userId}/`)) throw new Error("Invalid upload path");

    const apiKey = process.env["GEMINI_API_KEY"];
    if (!apiKey) return { suggested: null };

    // Get a signed URL for the image so Gemini can read it.
    const { data: signed } = await context.supabase.storage
      .from("studio-media")
      .createSignedUrl(data.storagePath, 300);
    if (!signed?.signedUrl) return { suggested: null };

    try {
      const result = await generateGeminiText({
        apiKey,
        systemInstruction: `You are an image metadata assistant. Analyze the image and return ONLY valid JSON with these fields:
{
  "title": string,
  "description": string,
  "tags": string[],
  "activity": string,
  "location_context": string,
  "time_context": "morning" | "afternoon" | "evening" | "night" | "anytime",
  "image_state": "current" | "historical" | "reference",
  "people": number,
  "mood": string
}
Use lowercase tags. Keep title under 60 chars.`,
        messages: [
          {
            role: "user",
            content: `Analyze this image and suggest metadata: ${signed.signedUrl}`,
          },
        ],
      });

      const raw = result.text.trim();
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return { suggested: null };
      const parsed = JSON.parse(jsonMatch[0]) as Partial<ImageSuggestion>;
      const suggested: ImageSuggestion = {
        title: String(parsed.title ?? ""),
        description: String(parsed.description ?? ""),
        tags: Array.isArray(parsed.tags) ? parsed.tags.map(String) : [],
        activity: String(parsed.activity ?? ""),
        location_context: String(parsed.location_context ?? ""),
        time_context: (parsed.time_context as ImageSuggestion["time_context"]) ?? "anytime",
        image_state: (parsed.image_state as ImageSuggestion["image_state"]) ?? "historical",
        people: Number(parsed.people ?? 0),
        mood: String(parsed.mood ?? ""),
      };
      return { suggested };
    } catch {
      // AI analysis is optional — never fail the upload because of it.
      return { suggested: null };
    }
  });

/** Saves AI-suggested metadata as the image's actual metadata (after user review). */
export const applySuggestedMetadata = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (input: {
      imageId: string;
      title?: string | null;
      description?: string | null;
      tags?: string[];
      activity?: string | null;
      locationContext?: string | null;
      timeContext?: "morning" | "afternoon" | "evening" | "night" | "anytime";
      imageState?: "current" | "historical" | "reference";
    }) => {
      if (!input?.imageId) throw new Error("imageId is required");
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    const { assertStudio } = await import("@/lib/studio-guard.server");
    await assertStudio(context);

    const patch: ImageLibraryUpdate = {
      updated_at: new Date().toISOString(),
      metadata_reviewed: true,
    };
    if (data.title !== undefined) patch.title = data.title;
    if (data.description !== undefined) patch.description = data.description;
    if (data.tags !== undefined) patch.tags = data.tags;
    if (data.activity !== undefined) patch.activity = data.activity;
    if (data.locationContext !== undefined) patch.location_context = data.locationContext;
    if (data.timeContext !== undefined) patch.time_context = data.timeContext;
    if (data.imageState !== undefined) patch.image_state = data.imageState;

    const { error } = await context.supabase
      .from("image_library")
      .update(patch)
      .eq("id", data.imageId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Saves a Studio image rule. */
export const saveImageRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (input: {
      id?: string;
      condition: string;
      action: "prefer" | "exclude" | "require";
      instruction?: string | null;
      priority?: number;
      active?: boolean;
    }) => {
      if (!input?.condition?.trim()) throw new Error("condition is required");
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    const { assertStudio } = await import("@/lib/studio-guard.server");
    await assertStudio(context);

    const payload = {
      user_id: context.userId,
      condition: data.condition.trim(),
      action: data.action,
      instruction: data.instruction ?? null,
      priority: data.priority ?? 0,
      active: data.active ?? true,
      updated_at: new Date().toISOString(),
    };

    const { error } = data.id
      ? await context.supabase
          .from("image_rules")
          .update(payload)
          .eq("id", data.id)
          .eq("user_id", context.userId)
      : await context.supabase.from("image_rules").insert(payload);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Deletes a Studio image rule. */
export const deleteImageRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { ruleId: string }) => {
    if (!input?.ruleId) throw new Error("ruleId is required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { assertStudio } = await import("@/lib/studio-guard.server");
    await assertStudio(context);
    const { error } = await context.supabase
      .from("image_rules")
      .delete()
      .eq("id", data.ruleId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
