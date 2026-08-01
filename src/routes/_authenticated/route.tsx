import { createFileRoute, Outlet, redirect, useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/liora/app-shell";
import { PresenceProvider } from "@/lib/presence";
import { CallProvider } from "@/lib/calls";
import { CallOverlay } from "@/components/liora/call-overlay";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth", search: { mode: "login", redirect: location.pathname } });
    }
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const location = useLocation();
  const bare = location.pathname.startsWith("/onboarding");

  return (
    <PresenceProvider>
      <CallProvider>
        {bare ? (
          <Outlet />
        ) : (
          <AppShell>
            <Outlet />
          </AppShell>
        )}
        <CallOverlay />
      </CallProvider>
    </PresenceProvider>
  );
}
