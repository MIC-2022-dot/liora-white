/**
 * Server-only image knowledge services.
 *
 * Provides the retrieval, ranking, and usage-tracking logic for the AI
 * contextual image sending feature. All database access is RLS-scoped
 * through the caller's own Supabase client.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type Client = SupabaseClient<Database>;

export type ImageTimeContext = "morning" | "afternoon" | "evening" | "night" | "anytime";
export type ImageState = "current" | "historical" | "reference";
export type ImageReusePolicy = "never" | "after_days" | "always";

export type LibraryImage = {
  id: string;
  user_id: string;
  storage_path: string;
  title: string | null;
  description: string | null;
  tags: string[];
  activity: string | null;
  location_context: string | null;
  time_context: ImageTimeContext;
  image_state: ImageState;
  ai_enabled: boolean;
  priority: number;
  reuse_policy: ImageReusePolicy;
  reuse_after_days: number | null;
  created_at: string;
  updated_at: string;
};

export type ImageRule = {
  id: string;
  user_id: string;
  condition: string;
  action: "prefer" | "exclude" | "require";
  instruction: string | null;
  priority: number;
  active: boolean;
};

export type ImageUsage = {
  id: string;
  image_id: string;
  owner_id: string;
  recipient_id: string;
  conversation_id: string | null;
  message_id: string | null;
  sent_at: string;
};

/** Maps the current hour to a time-of-day context. */
export function currentTimeContext(now: Date = new Date()): ImageTimeContext {
  const hour = now.getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

/** Loads all AI-enabled images for a user. */
export async function listAiImages(supabase: Client, userId: string): Promise<LibraryImage[]> {
  const { data, error } = await supabase
    .from("image_library")
    .select("*")
    .eq("user_id", userId)
    .eq("ai_enabled", true)
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as LibraryImage[];
}

/** Loads all active image rules for a user. */
export async function listImageRules(supabase: Client, userId: string): Promise<ImageRule[]> {
  const { data, error } = await supabase
    .from("image_rules")
    .select("*")
    .eq("user_id", userId)
    .eq("active", true)
    .order("priority", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as ImageRule[];
}

/** Loads usage history for a specific recipient. */
export async function listRecipientUsage(
  supabase: Client,
  ownerId: string,
  recipientId: string,
): Promise<ImageUsage[]> {
  const { data, error } = await supabase
    .from("image_usage")
    .select("*")
    .eq("owner_id", ownerId)
    .eq("recipient_id", recipientId);
  if (error) throw new Error(error.message);
  return (data ?? []) as ImageUsage[];
}

/** Records that an image was successfully sent to a recipient. */
export async function recordImageUsage(
  supabase: Client,
  input: {
    imageId: string;
    ownerId: string;
    recipientId: string;
    conversationId?: string | null;
    messageId?: string | null;
  },
): Promise<void> {
  const { error } = await supabase.from("image_usage").upsert(
    {
      image_id: input.imageId,
      owner_id: input.ownerId,
      recipient_id: input.recipientId,
      conversation_id: input.conversationId ?? null,
      message_id: input.messageId ?? null,
    },
    { onConflict: "image_id,recipient_id" },
  );
  if (error) throw new Error(error.message);
}

/**
 * Filters candidate images by recipient usage history and reuse policy.
 * Returns images that are eligible to be sent to this recipient.
 */
export function filterByRecipientHistory(
  images: LibraryImage[],
  usage: ImageUsage[],
  now: Date = new Date(),
): LibraryImage[] {
  const usedByRecipient = new Map(usage.map((u) => [u.image_id, u]));
  return images.filter((img) => {
    const used = usedByRecipient.get(img.id);
    if (!used) return true;
    if (img.reuse_policy === "always") return true;
    if (img.reuse_policy === "after_days" && img.reuse_after_days != null) {
      const elapsedMs = now.getTime() - new Date(used.sent_at).getTime();
      return elapsedMs >= img.reuse_after_days * 86400000;
    }
    return false; // "never" (default)
  });
}

/**
 * Ranks candidate images by relevance to the requested context.
 * Higher score = better match.
 */
export function rankImages(
  images: LibraryImage[],
  context: {
    tags?: string[];
    activity?: string | null;
    location?: string | null;
    time?: ImageTimeContext | null;
    currentStateOnly?: boolean;
  },
  now: Date = new Date(),
): LibraryImage[] {
  const requestedTags = new Set((context.tags ?? []).map((t) => t.toLowerCase()));
  const requestedActivity = context.activity?.toLowerCase() ?? null;
  const requestedLocation = context.location?.toLowerCase() ?? null;
  const requestedTime = context.time ?? null;
  const currentTime = currentTimeContext(now);

  return [...images]
    .map((img) => {
      let score = 0;

      // Current-state images are preferred when the request implies "right now".
      if (context.currentStateOnly && img.image_state === "current") score += 50;
      if (img.image_state === "current") score += 10;

      // Tag matches
      const imgTags = new Set(img.tags.map((t) => t.toLowerCase()));
      for (const tag of requestedTags) {
        if (imgTags.has(tag)) score += 20;
      }

      // Activity match
      if (requestedActivity && img.activity?.toLowerCase().includes(requestedActivity)) {
        score += 25;
      }

      // Location match
      if (requestedLocation && img.location_context?.toLowerCase().includes(requestedLocation)) {
        score += 25;
      }

      // Time-of-day match
      if (requestedTime && requestedTime !== "anytime") {
        if (img.time_context === requestedTime) score += 15;
      } else if (img.time_context === currentTime) {
        score += 5; // mild preference for current time when no explicit request
      }

      // Priority boost
      score += Math.min(img.priority, 10);

      return { img, score };
    })
    .sort((a, b) => b.score - a.score)
    .map(({ img }) => img);
}

/**
 * Applies Studio-configured rules to filter/boost candidate images.
 * Rules with action "exclude" remove images; "require" and "prefer" boost.
 */
export function applyRules(
  images: LibraryImage[],
  rules: ImageRule[],
  context: { tags?: string[]; activity?: string | null; location?: string | null },
): LibraryImage[] {
  if (!rules.length) return images;

  const requestedTags = new Set((context.tags ?? []).map((t) => t.toLowerCase()));
  const requestedActivity = context.activity?.toLowerCase() ?? null;
  const requestedLocation = context.location?.toLowerCase() ?? null;

  let result = [...images];

  for (const rule of rules) {
    const condition = rule.condition.toLowerCase();
    const matchesCondition =
      (requestedActivity && condition.includes(requestedActivity)) ||
      (requestedLocation && condition.includes(requestedLocation)) ||
      [...requestedTags].some((t) => condition.includes(t));

    if (!matchesCondition) continue;

    if (rule.action === "exclude") {
      // Exclude images matching the rule's instruction keywords
      const excludeTerms = (rule.instruction ?? "")
        .toLowerCase()
        .split(/[,\s]+/)
        .filter(Boolean);
      if (excludeTerms.length) {
        result = result.filter((img) => {
          const imgText = [
            img.title,
            img.description,
            img.activity,
            img.location_context,
            ...img.tags,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return !excludeTerms.some((term) => imgText.includes(term));
        });
      }
    } else if (rule.action === "require") {
      // Only keep images that match the rule's instruction keywords
      const requireTerms = (rule.instruction ?? "")
        .toLowerCase()
        .split(/[,\s]+/)
        .filter(Boolean);
      if (requireTerms.length) {
        result = result.filter((img) => {
          const imgText = [
            img.title,
            img.description,
            img.activity,
            img.location_context,
            ...img.tags,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return requireTerms.some((term) => imgText.includes(term));
        });
      }
    }
    // "prefer" is handled by the ranking step — rules with prefer just add
    // context hints that the caller can pass into rankImages.
  }

  return result;
}

/**
 * The full retrieval pipeline:
 * 1. Load AI-enabled images
 * 2. Load recipient usage history
 * 3. Filter by recipient history + reuse policy
 * 4. Apply Studio rules
 * 5. Rank by context
 * 6. Return the best match (or null)
 */
export async function retrieveBestImage(
  supabase: Client,
  input: {
    ownerId: string;
    recipientId: string;
    tags?: string[];
    activity?: string | null;
    location?: string | null;
    time?: ImageTimeContext | null;
    currentStateOnly?: boolean;
  },
): Promise<LibraryImage | null> {
  const [images, rules, usage] = await Promise.all([
    listAiImages(supabase, input.ownerId),
    listImageRules(supabase, input.ownerId),
    listRecipientUsage(supabase, input.ownerId, input.recipientId),
  ]);

  if (!images.length) return null;

  const eligible = filterByRecipientHistory(images, usage);
  if (!eligible.length) return null;

  const ruleContext: { tags?: string[]; activity?: string | null; location?: string | null } = {};
  if (input.tags) ruleContext.tags = input.tags;
  if (input.activity) ruleContext.activity = input.activity;
  if (input.location) ruleContext.location = input.location;

  const rankContext: {
    tags?: string[];
    activity?: string | null;
    location?: string | null;
    time?: ImageTimeContext | null;
    currentStateOnly?: boolean;
  } = {};
  if (input.tags) rankContext.tags = input.tags;
  if (input.activity) rankContext.activity = input.activity;
  if (input.location) rankContext.location = input.location;
  if (input.time) rankContext.time = input.time;
  if (input.currentStateOnly) rankContext.currentStateOnly = input.currentStateOnly;

  const ruleFiltered = applyRules(eligible, rules, ruleContext);
  const ranked = rankImages(ruleFiltered.length ? ruleFiltered : eligible, rankContext);

  return ranked[0] ?? null;
}
