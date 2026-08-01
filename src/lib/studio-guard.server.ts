import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type GuardContext = { supabase: SupabaseClient<Database>; userId: string };

/** Server-only Studio authorization guard, used by Studio server functions. */
export async function assertStudio(context: GuardContext) {
  const { data, error } = await context.supabase.rpc("has_studio_access", {
    _user_id: context.userId,
  });
  if (error) throw new Error("Could not verify Studio permission");
  if (!data) throw new Error("Forbidden: Studio access is not enabled for this account");
}

export async function assertAdmin(context: GuardContext) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error("Could not verify permissions");
  if (!data) throw new Error("Forbidden: administrator access required");
}
