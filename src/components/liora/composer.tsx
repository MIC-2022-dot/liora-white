import { useRef, useState } from "react";
import { Image as ImageIcon, Loader2, Mic, Paperclip, Send, Square, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { uploadTo, fileExt } from "@/lib/storage";
import { sendMessage } from "@/lib/chat";
import type { ChatMessage } from "@/hooks/use-messages";

export function Composer({
  conversationId,
  senderId,
  replyTo,
  onClearReply,
  onTyping,
}: {
  conversationId: string;
  senderId: string;
  replyTo: ChatMessage | null;
  onClearReply: () => void;
  onTyping: () => void;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const imageRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function submitText() {
    const body = text.trim();
    if (!body || busy) return;
    setText("");
    onClearReply();
    try {
      await sendMessage({
        conversationId,
        senderId,
        body,
        kind: "text",
        replyTo: replyTo?.id ?? null,
      });
    } catch (err) {
      setText(body);
      toast.error(err instanceof Error ? err.message : "Message not sent");
    }
  }

  async function submitFile(file: File, kind: "image" | "file") {
    setBusy(true);
    try {
      const path = `${conversationId}/${senderId}-${Date.now()}.${fileExt(file, "bin")}`;
      await uploadTo("chat-media", path, file);
      await sendMessage({
        conversationId,
        senderId,
        kind,
        mediaUrl: path,
        mediaMeta: { name: file.name, size: file.size, type: file.type },
        replyTo: replyTo?.id ?? null,
      });
      onClearReply();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function toggleRecording() {
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size < 1000) return;
        setBusy(true);
        try {
          const path = `${conversationId}/${senderId}-${Date.now()}.webm`;
          await uploadTo("chat-media", path, blob);
          await sendMessage({
            conversationId,
            senderId,
            kind: "audio",
            mediaUrl: path,
            mediaMeta: { type: "audio/webm" },
          });
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Could not send voice message");
        } finally {
          setBusy(false);
        }
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
    } catch {
      toast.error("Microphone access is needed to record a voice message.");
    }
  }

  return (
    <div className="border-t border-border bg-background px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      {replyTo && (
        <div className="mb-2 flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-xs">
          <span className="flex-1 truncate text-muted-foreground">
            Replying to: {replyTo.body ?? "Attachment"}
          </span>
          <button onClick={onClearReply} aria-label="Cancel reply">
            <X className="size-3.5" />
          </button>
        </div>
      )}
      <div className="flex items-end gap-1.5">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => imageRef.current?.click()}
          aria-label="Send a photo"
        >
          <ImageIcon className="size-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => fileRef.current?.click()}
          aria-label="Attach a file"
        >
          <Paperclip className="size-5" />
        </Button>

        <Textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            onTyping();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submitText();
            }
          }}
          placeholder={recording ? "Recording…" : "Message"}
          rows={1}
          className="max-h-32 min-h-10 flex-1 resize-none rounded-2xl py-2.5"
        />

        {text.trim() ? (
          <Button size="icon" onClick={() => void submitText()} disabled={busy} aria-label="Send">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        ) : (
          <Button
            size="icon"
            variant={recording ? "destructive" : "default"}
            onClick={() => void toggleRecording()}
            disabled={busy}
            aria-label={recording ? "Stop recording" : "Record voice message"}
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : recording ? (
              <Square className="size-4" />
            ) : (
              <Mic className="size-4" />
            )}
          </Button>
        )}
      </div>

      <input
        ref={imageRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void submitFile(f, "image");
          e.target.value = "";
        }}
      />
      <input
        ref={fileRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void submitFile(f, "file");
          e.target.value = "";
        }}
      />
    </div>
  );
}
