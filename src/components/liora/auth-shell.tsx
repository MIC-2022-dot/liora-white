import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Wordmark } from "@/components/liora/wordmark";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-surface/50">
      <header className="px-5 py-6">
        <Link to="/">
          <Wordmark />
        </Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-5 pb-16">
        <div className="panel w-full max-w-md p-7 sm:p-9">
          <h1 className="text-3xl font-semibold">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}
          <div className="mt-7">{children}</div>
        </div>
      </main>
    </div>
  );
}
