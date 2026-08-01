import { cn } from "@/lib/utils";

export function Wordmark({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "wordmark inline-flex items-baseline gap-1.5 text-foreground",
        size === "sm" && "text-lg",
        size === "md" && "text-2xl",
        size === "lg" && "text-4xl",
        className,
      )}
    >
      <span className="inline-block size-2 translate-y-[-0.15em] rounded-full bg-primary" />
      Liora
    </span>
  );
}
