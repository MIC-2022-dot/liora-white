import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Small technical status chip used across the Studio workspace. */
export function StatusPill({
  state,
  children,
}: {
  state: "ready" | "pending" | "off" | "error";
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-[11px] tracking-wide uppercase",
        state === "ready" && "border-success/30 bg-success/10 text-success",
        state === "pending" && "border-primary/30 bg-primary/10 text-primary",
        state === "off" && "border-border bg-muted text-muted-foreground",
        state === "error" && "border-destructive/30 bg-destructive/10 text-destructive",
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          state === "ready" && "bg-success",
          state === "pending" && "bg-primary",
          state === "off" && "bg-muted-foreground/60",
          state === "error" && "bg-destructive",
        )}
      />
      {children}
    </span>
  );
}

export function WorkspaceHeader({
  eyebrow,
  title,
  description,
  status,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  status?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
            {eyebrow}
          </p>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl leading-tight">{title}</h1>
          {status}
        </div>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Panel({
  title,
  hint,
  aside,
  children,
  className,
}: {
  title?: string;
  hint?: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border border-border bg-card", className)}>
      {(title || aside) && (
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-3.5">
          <div className="min-w-0">
            {title && (
              <h2 className="font-mono text-xs tracking-[0.14em] text-foreground uppercase">
                {title}
              </h2>
            )}
            {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
          </div>
          {aside}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={htmlFor}
        className="block font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase"
      >
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function ProviderNotice({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
      {message}
    </div>
  );
}
