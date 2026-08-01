import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  onboarding_completed: boolean;
};

type AuthState = {
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  hasStudio: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasStudio, setHasStudio] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadFor(userId: string | undefined) {
    if (!userId) {
      setProfile(null);
      setIsAdmin(false);
      setHasStudio(false);
      return;
    }
    const [{ data: p }, { data: roles }, { data: access }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, username, display_name, bio, avatar_url, onboarding_completed")
        .eq("id", userId)
        .maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("studio_access").select("enabled").eq("user_id", userId).maybeSingle(),
    ]);
    setProfile((p as Profile) ?? null);
    const admin = (roles ?? []).some((r) => r.role === "admin");
    setIsAdmin(admin);
    setHasStudio(admin || Boolean(access?.enabled));
  }

  useEffect(() => {
    let active = true;

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      // Never call other supabase functions synchronously in this callback.
      setTimeout(() => {
        void loadFor(nextSession?.user?.id).finally(() => active && setLoading(false));
      }, 0);
    });

    void supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      await loadFor(data.session?.user?.id);
      if (active) setLoading(false);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      loading,
      session,
      user: session?.user ?? null,
      profile,
      isAdmin,
      hasStudio,
      refresh: () => loadFor(session?.user?.id),
      signOut: async () => {
        await supabase.auth.signOut();
        setProfile(null);
        setIsAdmin(false);
        setHasStudio(false);
      },
    }),
    [loading, session, profile, isAdmin, hasStudio],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
