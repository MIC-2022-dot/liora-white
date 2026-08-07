import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import {
  BookOpen,
  BrainCircuit,
  FlaskConical,
  Image as ImageIcon,
  MessagesSquare,
  LayoutDashboard,
  MessageSquareCode,
  PhoneCall,
  ScrollText,
  ShieldCheck,
  Sparkle,
  UserSquare2,
  Waves,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { EmptyState } from "@/components/liora/states";

export const Route = createFileRoute("/_authenticated/studio")({
  head: () => ({
    meta: [
      { title: "Studio · Liora" },
      {
        name: "description",
        content:
          "Configure, test and control the AI representation that can speak for you on Liora.",
      },
      { property: "og:title", content: "Studio · Liora" },
      {
        property: "og:description",
        content:
          "Configure, test and control the AI representation that can speak for you on Liora.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StudioLayout,
});

const SECTIONS = [
  { to: "/studio", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/studio/avatar", label: "Avatar", icon: UserSquare2 },
  { to: "/studio/personality", label: "Personality", icon: BrainCircuit },
  { to: "/studio/instructions", label: "Instructions", icon: ScrollText },
  { to: "/studio/knowledge", label: "Knowledge", icon: BookOpen },
  { to: "/studio/images", label: "Image Library", icon: ImageIcon },
  { to: "/studio/image-rules", label: "Image Rules", icon: ShieldCheck },
  { to: "/studio/voice", label: "Voice", icon: Waves },
  { to: "/studio/calls", label: "AI Calls", icon: PhoneCall },
  { to: "/studio/chats", label: "Autopilot", icon: MessagesSquare },
  { to: "/studio/training", label: "Training", icon: FlaskConical },
  { to: "/studio/test", label: "Test", icon: MessageSquareCode },
] as const;

function StudioLayout() {
  const { hasStudio } = useAuth();
  const location = useLocation();

  if (!hasStudio) {
    return (
      <EmptyState
        icon={<Sparkle className="size-5" />}
        title="Studio is invite-only"
        body="An administrator can unlock Studio for your account. You'll get a notification the moment it's available."
      />
    );
  }

  const active = (to: string, exact?: boolean) =>
    exact ? location.pathname === to : location.pathname.startsWith(to);

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <aside className="shrink-0 border-b border-border bg-surface/60 lg:w-[212px] lg:border-r lg:border-b-0">
        <div className="hidden px-5 pt-6 lg:block">
          <p className="font-mono text-[11px] tracking-[0.2em] text-muted-foreground uppercase">
            Liora
          </p>
          <p className="font-display text-lg">Studio</p>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 py-3 lg:mt-5 lg:flex-col lg:overflow-visible lg:px-3 lg:py-0">
          {SECTIONS.map(({ to, label, icon: Icon, ...rest }) => {
            const isActive = active(to, "exact" in rest ? rest.exact : false);
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-4xl px-5 py-8 lg:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
