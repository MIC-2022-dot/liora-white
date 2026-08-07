import { useState } from "react";
import { Check, CheckCheck, Download, FileText, Smile } from "lucide-react";
import { cn } from "@/lib/utils";
import { timeShort } from "@/lib/format";
import { useSignedUrl } from "@/hooks/use-signed-url";
import type { ChatMessage, Reaction } from "@/hooks/use-messages";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const EMOJI = ["❤️", "😂", "👍", "🔥", "😮", "🙏"];

function MediaImage({ path, meta }: { path: string; meta?: Record<string, unknown> | null }) {
  // Library images are stored in studio-media; chat images in chat-media
  const bucket = (meta as { library_image?: boolean } | null)?.library_image
    ? "studio-media"
    : "chat-media";
  const url = useSignedUrl(bucket, path);
  if (!url) return <div className="h-48 w-64 animate-pulse rounded-xl bg-muted" />;
  return (
    <a href={url} target="_blank" rel="noreferrer">
      <img src={url} alt="Shared image" className="max-h-72 rounded-xl object-cover" />
    </a>
  );
}

function MediaAudio({ path }: { path: string }) {
  const url = useSignedUrl("chat-media", path);
  if (!url) return <div className="h-10 w-56 animate-pulse rounded-full bg-muted" />;
  return <audio controls src={url} className="w-56" />;
}

function MediaFile({ path, name }: { path: string; name: string }) {
  const url = useSignedUrl("chat-media", path);
  return (
    <a
      href={url ?? undefined}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-3 rounded-xl bg-background/40 px-3 py-2 text-sm"
    >
      <FileText className="size-4 shrink-0" />
      <span className="max-w-40 truncate">{name}</span>
      <Download className="size-3.5 opacity-60" />
    </a>
  );
}

export function MessageBubble({
  message,
  mine,
  reactions,
  replyTo,
  read,
  onReact,
  onReply,
}: {
  message: ChatMessage;
  mine: boolean;
  reactions: Reaction[];
  replyTo: ChatMessage | null;
  read: boolean;
  onReact: (emoji: string) => void;
  onReply: () => void;
}) {
  const [open, setOpen] = useState(false);
  const grouped = Object.entries(
    reactions.reduce<Record<string, number>>((acc, r) => {
      acc[r.emoji] = (acc[r.emoji] ?? 0) + 1;
      return acc;
    }, {}),
  );
  const fileName = String((message.media_meta as { name?: string } | null)?.name ?? "Attachment");

  if (message.deleted_at) {
    return (
      <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
        <p className="rounded-2xl border border-dashed border-border px-3.5 py-2 text-xs text-muted-foreground italic">
          Message deleted
        </p>
      </div>
    );
  }

  return (
    <div className={cn("group flex items-end gap-2", mine ? "justify-end" : "justify-start")}>
      {mine && <ReactButton open={open} setOpen={setOpen} onReact={onReact} onReply={onReply} />}
      <div
        className={cn(
          "max-w-[78%] rounded-2xl px-3.5 py-2 shadow-sm sm:max-w-[65%]",
          mine
            ? "rounded-br-md bg-bubble-out text-bubble-out-foreground"
            : "rounded-bl-md bg-bubble-in text-bubble-in-foreground",
        )}
      >
        {replyTo && (
          <div className="mb-1.5 border-l-2 border-current/30 pl-2 text-xs opacity-70">
            <span className="line-clamp-2">{replyTo.body ?? "Attachment"}</span>
          </div>
        )}

        {message.kind === "image" && message.media_url && (
          <MediaImage path={message.media_url} meta={message.media_meta} />
        )}
        {message.kind === "audio" && message.media_url && <MediaAudio path={message.media_url} />}
        {message.kind === "file" && message.media_url && (
          <MediaFile path={message.media_url} name={fileName} />
        )}
        {message.body && (
          <p className="text-[15px] leading-relaxed break-words whitespace-pre-wrap">
            {message.body}
          </p>
        )}

        <div className="mt-1 flex items-center justify-end gap-1 text-[10px] opacity-60">
          {timeShort(message.created_at)}
          {mine && (read ? <CheckCheck className="size-3" /> : <Check className="size-3" />)}
        </div>

        {grouped.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {grouped.map(([emoji, count]) => (
              <span key={emoji} className="rounded-full bg-background/50 px-1.5 py-0.5 text-[11px]">
                {emoji} {count > 1 ? count : ""}
              </span>
            ))}
          </div>
        )}
      </div>
      {!mine && <ReactButton open={open} setOpen={setOpen} onReact={onReact} onReply={onReply} />}
    </div>
  );
}

function ReactButton({
  open,
  setOpen,
  onReact,
  onReply,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  onReact: (emoji: string) => void;
  onReply: () => void;
}) {
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="mb-1 rounded-full p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
          aria-label="React to message"
        >
          <Smile className="size-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-1.5" align="center">
        <div className="flex items-center gap-0.5">
          {EMOJI.map((e) => (
            <button
              key={e}
              className="rounded-md px-1.5 py-1 text-lg hover:bg-accent"
              onClick={() => {
                onReact(e);
                setOpen(false);
              }}
            >
              {e}
            </button>
          ))}
          <button
            className="ml-1 rounded-md px-2 py-1 text-xs hover:bg-accent"
            onClick={() => {
              onReply();
              setOpen(false);
            }}
          >
            Reply
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
