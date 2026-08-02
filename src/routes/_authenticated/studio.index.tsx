import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Check, Minus } from "lucide-react";
import { studioProviderStatus } from "@/lib/studio.functions";
import { useStudioConfig, studioCompleteness } from "@/hooks/use-studio-config";
import { Panel, StatusPill, WorkspaceHeader } from "@/components/studio/ui";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/studio/")({
  head: () => ({
    meta: [
      { title: "Studio overview · Liora" },
      {
        name: "description",
        content: "Live status of your Liora AI representation: avatar, voice, knowledge and calls.",
      },
      { property: "og:title", content: "Studio overview · Liora" },
      {
        property: "og:description",
        content: "Live status of your Liora AI representation: avatar, voice, knowledge and calls.",
      },
    ],
  }),
  component: Overview,
});

type Providers = Awaited<ReturnType<typeof studioProviderStatus>>;

function Overview() {
  const { config, loading, error } = useStudioConfig();
  const [providers, setProviders] = useState<Providers | null>(null);

  useEffect(() => {
    void studioProviderStatus().then(setProviders).catch(() => setProviders(null));
  }, []);

  const { checks, done, total, percent } = studioCompleteness(config);
  const ready = done >= 3 && Boolean(config.personality || config.instructions);

  return (
    <div className="space-y-6">
      <WorkspaceHeader
        eyebrow="Studio / Overview"
        title="AI representation"
        description="Everything your digital representation uses when it speaks for you. Status below is read live from your configuration."
        status={
          loading ? null : (
            <StatusPill state={ready ? "ready" : "pending"}>
              {ready ? "Ready" : "Setup incomplete"}
            </StatusPill>
          )
        }
      />

      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-56 w-full rounded-xl" />
        </div>
      ) : (
        <>
          <Panel title="Configuration completeness" hint={`${done} of ${total} sections set up`}>
            <Progress value={percent} className="h-2" />
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {checks.map((c) => (
                <div
                  key={c.key}
                  className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <span
                    className={
                      c.done
                        ? "flex size-5 items-center justify-center rounded-md bg-success/15 text-success"
                        : "flex size-5 items-center justify-center rounded-md bg-muted text-muted-foreground"
                    }
                  >
                    {c.done ? <Check className="size-3.5" /> : <Minus className="size-3.5" />}
                  </span>
                  <span className="flex-1">{c.label}</span>
                  <span className="font-mono text-[11px] text-muted-foreground uppercase">
                    {c.done ? "set" : "empty"}
                  </span>
                </div>
              ))}
            </div>
          </Panel>

          <div className="grid gap-4 md:grid-cols-2">
            <Panel title="Providers" hint="Real connection state — never simulated.">
              <dl className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Avatar streaming</dt>
                  <dd>
                    <StatusPill state={providers?.avatar.configured ? "ready" : "off"}>
                      {providers?.avatar.configured
                        ? (providers.avatar.provider ?? "connected")
                        : "not configured"}
                    </StatusPill>
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Voice synthesis</dt>
                  <dd>
                    <StatusPill state={providers?.voice.configured ? "ready" : "off"}>
                      {providers?.voice.configured
                        ? (providers.voice.provider ?? "connected")
                        : "not configured"}
                    </StatusPill>
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Text reasoning</dt>
                  <dd>
                    <StatusPill state="ready">lovable ai</StatusPill>
                  </dd>
                </div>
              </dl>
              {!providers?.avatar.configured && (
                <p className="mt-4 text-xs text-muted-foreground">
                  {providers?.avatar.message ??
                    "Provider status is loading or unavailable for this account."}
                </p>
              )}
            </Panel>

            <Panel title="AI calling" hint="Applied to incoming calls right now.">
              <dl className="space-y-3 text-sm">
                {[
                  ["AI answering", config.calls?.enabled],
                  ["Voice calls", config.calls?.voice_calls],
                  ["Video calls", config.calls?.video_calls],
                  ["Manual switching", config.calls?.manual_switching],
                ].map(([label, on]) => (
                  <div key={String(label)} className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">{label as string}</dt>
                    <dd>
                      <StatusPill state={on ? "ready" : "off"}>
                        {on ? "enabled" : "disabled"}
                      </StatusPill>
                    </dd>
                  </div>
                ))}
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Answer delay</dt>
                  <dd className="font-mono text-xs">
                    {config.calls?.answer_after_seconds ?? 10}s
                  </dd>
                </div>
              </dl>
            </Panel>
          </div>

          <Panel title="Quick actions">
            <div className="flex flex-wrap gap-2">
              {[
                ["/studio/avatar", "Configure avatar"],
                ["/studio/personality", "Edit personality"],
                ["/studio/knowledge", "Add knowledge"],
                ["/studio/calls", "AI call settings"],
                ["/studio/test", "Test your AI"],
              ].map(([to, label]) => (
                <Button key={to} asChild variant="outline" size="sm">
                  <Link to={to}>
                    {label}
                    <ArrowUpRight className="size-3.5" />
                  </Link>
                </Button>
              ))}
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}
