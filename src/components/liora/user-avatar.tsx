import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";
import { useSignedUrl } from "@/hooks/use-signed-url";

type MinimalProfile = {
  display_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
} | null;

const SIZES = {
  xs: "size-7 text-[10px]",
  sm: "size-9 text-xs",
  md: "size-11 text-sm",
  lg: "size-16 text-lg",
  xl: "size-24 text-2xl",
} as const;

export function UserAvatar({
  profile,
  size = "md",
  online,
  className,
}: {
  profile: MinimalProfile;
  size?: keyof typeof SIZES;
  online?: boolean;
  className?: string;
}) {
  const raw = profile?.avatar_url ?? null;
  const isRemote = Boolean(raw && /^https?:\/\//.test(raw));
  const signed = useSignedUrl("avatars", isRemote ? null : raw);
  const src = isRemote ? raw : signed;

  return (
    <div className={cn("relative shrink-0", className)}>
      <div
        className={cn(
          "flex items-center justify-center overflow-hidden rounded-full bg-accent font-semibold text-accent-foreground",
          SIZES[size],
        )}
      >
        {src ? (
          <img src={src} alt="" className="size-full object-cover" />
        ) : (
          <span>{initials(profile?.display_name ?? profile?.username)}</span>
        )}
      </div>
      {online !== undefined && (
        <span
          className={cn(
            "absolute right-0 bottom-0 rounded-full border-2 border-background",
            size === "xs" || size === "sm" ? "size-2.5" : "size-3",
            online ? "bg-success" : "bg-muted-foreground/40",
          )}
        />
      )}
    </div>
  );
}
