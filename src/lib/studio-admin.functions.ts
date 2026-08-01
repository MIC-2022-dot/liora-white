import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Admin-only Studio access management. Authorization is verified server-side. */

export const listStudioAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin } = await import("@/lib/studio-guard.server");
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: profiles }, { data: access }, { data: roles }] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id, display_name, username, avatar_url")
        .order("created_at", { ascending: true }),
      supabaseAdmin.from("studio_access").select("user_id, enabled, granted_at"),
      supabaseAdmin.from("user_roles").select("user_id, role"),
    ]);

    const accessMap = new Map((access ?? []).map((a) => [a.user_id, a]));
    const adminSet = new Set(
      (roles ?? []).filter((r) => r.role === "admin").map((r) => r.user_id),
    );

    return (profiles ?? []).map((p) => ({
      id: p.id,
      display_name: p.display_name,
      username: p.username,
      avatar_url: p.avatar_url,
      enabled: adminSet.has(p.id) || Boolean(accessMap.get(p.id)?.enabled),
      is_admin: adminSet.has(p.id),
      granted_at: accessMap.get(p.id)?.granted_at ?? null,
    }));
  });

export const setStudioAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; enabled: boolean }) => {
    if (!input?.userId) throw new Error("userId is required");
    return { userId: input.userId, enabled: Boolean(input.enabled) };
  })
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/studio-guard.server");
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.enabled) {
      const { error } = await supabaseAdmin.from("studio_access").upsert({
        user_id: data.userId,
        enabled: true,
        granted_by: context.userId,
      });
      if (error) throw new Error(error.message);
      await supabaseAdmin.from("notifications").insert({
        user_id: data.userId,
        type: "account",
        title: "Studio unlocked",
        body: "Studio is now available in your Liora navigation.",
      });
    } else {
      const { error } = await supabaseAdmin
        .from("studio_access")
        .update({ enabled: false })
        .eq("user_id", data.userId);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });
