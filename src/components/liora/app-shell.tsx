import { useEffect, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Bell, MessageCircle, Phone, Settings, Sparkle, User, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { Wordmark } from "@/components/liora/wordmark";
import { UserAvatar } from "@/components/liora/user-avatar";
import { useUnreadNotifications } from "@/hooks/use-notifications";
import { useChatAutopilot } from "@/lib/ai/chat-autopilot";

const NAV = [
  { to: "/chats", label: "Chats", icon: MessageCircle },
  { to: "/calls", label: "Calls", icon: Phone },
  { to: "/contacts", label: "Contacts", icon: Users },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, hasStudio, loading, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const unread = useUnreadNotifications();

  // Onboarding gate: a signed-in account without a username cannot use the app.
  useEffect(() => {
    if (loading || !user) return;
    if (profile && !profile.onboarding_completed) {
      void navigate({ to: "/onboarding" });
    }
  }, [loading, user, profile, navigate]);

  const items = [
    ...NAV,
    ...(hasStudio ? ([{ to: "/studio", label: "Studio", icon: Sparkle }] as const) : []),
    { to: "/profile", label: "Profile", icon: User },
  ];

  const isActive = (to: string) => location.pathname === to || location.pathname.startsWith(to + "/");

  return (
    <div className="flex min-h-dvh flex-col bg-background md:flex-row">
      {/* Desktop rail */}
      <aside className="hidden w-[248px] shrink-0 flex-col border-r border-border bg-sidebar px-4 py-6 md:flex">
        <Link to="/chats" className="px-2">
          <Wordmark />
        </Link>
        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {items.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                isActive(to)
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
              )}
            >
              <Icon className="size-[18px]" />
              {label}
            </Link>
          ))}
          <div className="mt-auto space-y-1 pt-6">
            <Link
              to="/notifications"
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                isActive("/notifications")
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
              )}
            >
              <Bell className="size-[18px]" />
              Notifications
              {unread > 0 && (
                <span className="ml-auto rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                  {unread}
                </span>
              )}
            </Link>
            <Link
              to="/settings"
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                isActive("/settings")
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
              )}
            >
              <Settings className="size-[18px]" />
              Settings
            </Link>
            <Link
              to="/profile"
              className="mt-3 flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5"
            >
              <UserAvatar profile={profile} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{profile?.display_name ?? "You"}</p>
                <p className="truncate text-xs text-muted-foreground">
                  @{profile?.username ?? "…"}
                </p>
              </div>
            </Link>
          </div>
        </nav>
      </aside>

      <div className="flex min-h-0 flex-1 flex-col pb-16 md:pb-0">{children}</div>

      {/* Mobile tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {items.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
              isActive(to) ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Icon className="size-5" />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
