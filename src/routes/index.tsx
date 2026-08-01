import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Lock, MessageCircle, Phone, ShieldCheck, Users, Video } from "lucide-react";
import heroImage from "@/assets/liora-hero.jpg";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/liora/wordmark";
import { ConversationPreview } from "@/components/liora/conversation-preview";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Liora — Premium messaging, voice and video calls" },
      {
        name: "description",
        content:
          "Liora is a private, premium communication app: real-time messaging, crystal-clear voice and video calls, and profiles built for the people who matter most.",
      },
      { property: "og:title", content: "Liora — Premium messaging, voice and video calls" },
      {
        property: "og:description",
        content:
          "Real-time messaging, voice and video calls, and private profiles. Create your Liora account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Wordmark />
          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a href="#messaging" className="transition-colors hover:text-foreground">
              Messaging
            </a>
            <a href="#calls" className="transition-colors hover:text-foreground">
              Calls
            </a>
            <a href="#privacy" className="transition-colors hover:text-foreground">
              Privacy
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/auth" search={{ mode: "login", redirect: undefined }}>
                Login
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/auth" search={{ mode: "signup", redirect: undefined }}>
                Get Started
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 pb-20 pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:pb-28 lg:pt-24">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                <span className="size-1.5 rounded-full bg-primary" />
                Private by design
              </span>
              <h1 className="mt-6 text-5xl leading-[1.02] font-semibold text-balance sm:text-6xl lg:text-7xl">
                Stay close to the people who matter.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
                Liora is a calm, premium place to talk. Real-time messages, warm voice calls and
                effortless video — wrapped in an interface that gets out of the way.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link to="/auth" search={{ mode: "signup", redirect: undefined }}>
                    Get Started
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to="/auth" search={{ mode: "login", redirect: undefined }}>
                    Login
                  </Link>
                </Button>
              </div>
              <dl className="mt-12 grid max-w-md grid-cols-3 gap-6 border-t border-border pt-8">
                {[
                  ["Instant", "message delivery"],
                  ["HD", "voice & video"],
                  ["Private", "by default"],
                ].map(([a, b]) => (
                  <div key={a}>
                    <dt className="font-display text-2xl text-foreground">{a}</dt>
                    <dd className="mt-1 text-xs text-muted-foreground">{b}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="relative">
              <div className="absolute -inset-6 -z-10 rounded-[3rem] bg-accent/60 blur-2xl" />
              <div className="grid grid-cols-[1fr_1.15fr] items-end gap-4">
                <img
                  src={heroImage}
                  alt="A woman speaking on a voice call in warm natural light"
                  width={1200}
                  height={1504}
                  className="aspect-[3/4] w-full rounded-3xl object-cover shadow-[var(--shadow-lift)]"
                />
                <ConversationPreview />
              </div>
            </div>
          </div>
        </section>

        {/* Feature sections */}
        <section id="messaging" className="border-t border-border bg-surface/60">
          <div className="mx-auto max-w-6xl px-5 py-20 lg:py-24">
            <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
              What's inside
            </p>
            <h2 className="mt-4 max-w-2xl text-4xl leading-tight font-semibold sm:text-5xl">
              Everything a conversation needs. Nothing it doesn't.
            </h2>
            <div className="mt-14 grid gap-6 md:grid-cols-3">
              {[
                {
                  icon: MessageCircle,
                  title: "Real-time messaging",
                  body: "Messages arrive the moment they're sent. Replies, reactions, photos and voice notes, with typing indicators and read receipts.",
                },
                {
                  icon: Phone,
                  title: "Voice calls",
                  body: "Peer-to-peer voice that sounds like the person is in the room. Ring, answer, and pick right back up where you left off.",
                },
                {
                  icon: Video,
                  title: "Video calls",
                  body: "Face-to-face on any device. Camera and microphone controls that stay out of your way during the conversation.",
                },
                {
                  icon: Users,
                  title: "Profiles & contacts",
                  body: "A username, a photo, a short bio. Find people, save contacts and see who's online right now.",
                },
                {
                  icon: ShieldCheck,
                  title: "Presence you control",
                  body: "Online, offline and last seen — with privacy settings that decide who gets to know.",
                },
                {
                  icon: Lock,
                  title: "Private communication",
                  body: "Your conversations are readable only by their participants, enforced at the database level, not just in the interface.",
                },
              ].map(({ icon: Icon, title, body }) => (
                <div key={title} className="panel p-6">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="mt-5 text-xl font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Calls */}
        <section id="calls" className="mx-auto max-w-6xl px-5 py-20 lg:py-28">
          <div className="grid items-center gap-14 lg:grid-cols-2">
            <div className="order-2 lg:order-1">
              <div className="panel mx-auto w-full max-w-sm overflow-hidden bg-ink p-0 text-ink-foreground">
                <div className="flex flex-col items-center px-8 py-14">
                  <div className="pulse-ring flex size-24 items-center justify-center rounded-full bg-surface-strong/20 text-3xl">
                    <span className="font-display">DL</span>
                  </div>
                  <p className="mt-6 text-lg font-medium">David L.</p>
                  <p className="mt-1 text-sm opacity-60">Calling…</p>
                  <div className="mt-10 flex items-center gap-4">
                    <span className="flex size-12 items-center justify-center rounded-full bg-surface-strong/20">
                      <Phone className="size-5" />
                    </span>
                    <span className="flex size-12 items-center justify-center rounded-full bg-surface-strong/20">
                      <Video className="size-5" />
                    </span>
                    <span className="flex size-12 rotate-[135deg] items-center justify-center rounded-full bg-destructive">
                      <Phone className="size-5" />
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">Calls</p>
              <h2 className="mt-4 text-4xl leading-tight font-semibold sm:text-5xl">
                One tap from a message to a conversation.
              </h2>
              <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
                Every chat carries a call button. Outgoing, incoming, missed and answered calls all
                land in one clean history so nothing gets lost.
              </p>
              <ul className="mt-8 space-y-3">
                {[
                  "Voice and video from any conversation",
                  "Full-screen incoming call experience",
                  "Complete, searchable call history",
                  "Mute, camera and speaker controls",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm">
                    <Check className="mt-0.5 size-4 text-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Privacy */}
        <section id="privacy" className="border-y border-border bg-ink text-ink-foreground">
          <div className="mx-auto max-w-4xl px-5 py-24 text-center">
            <p className="text-xs tracking-[0.18em] uppercase opacity-60">Privacy</p>
            <h2 className="mt-4 text-4xl leading-tight font-semibold text-balance sm:text-5xl">
              Your conversations belong to you.
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed opacity-70">
              Access rules are enforced in the database itself. Only the people in a conversation
              can read it — no exceptions, no shortcuts, no hidden dashboards.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-4xl px-5 py-24 text-center">
          <h2 className="text-4xl leading-tight font-semibold text-balance sm:text-5xl">
            Create your Liora account.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
            It takes a minute. Pick a username, add a photo, and start talking.
          </p>
          <Button asChild size="lg" className="mt-9">
            <Link to="/auth" search={{ mode: "signup", redirect: undefined }}>
              Get Started
            </Link>
          </Button>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-10 sm:flex-row">
          <Wordmark size="sm" />
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Liora. Private messaging and calls.
          </p>
        </div>
      </footer>
    </div>
  );
}
