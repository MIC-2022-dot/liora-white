import { useEffect, useRef, useState } from "react";
import {
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Sparkle,
  User,
  Video,
  VideoOff,
} from "lucide-react";
import { useCall } from "@/lib/calls";
import { useAuth } from "@/lib/auth";
import { UserAvatar } from "@/components/liora/user-avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function useElapsed(startedAt: number | null) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!startedAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  if (!startedAt) return null;
  const s = Math.max(0, Math.floor((now - startedAt) / 1000));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function Stream({
  stream,
  muted,
  className,
}: {
  stream: MediaStream | null;
  muted?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current && stream) ref.current.srcObject = stream;
  }, [stream]);
  if (!stream) return null;
  return (
    <video ref={ref} autoPlay playsInline muted={muted} className={cn("object-cover", className)} />
  );
}

export function CallOverlay() {
  const {
    call,
    localStream,
    remoteStream,
    micEnabled,
    cameraEnabled,
    canUseAi,
    answer,
    decline,
    hangUp,
    toggleMic,
    toggleCamera,
    switchMode,
  } = useCall();
  const { hasStudio } = useAuth();
  const elapsed = useElapsed(call?.startedAt ?? null);

  if (!call) return null;

  const ringing = call.status === "incoming" || call.status === "outgoing";
  const isVideo = call.kind === "video";
  const aiActive = call.mode === "ai";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink text-ink-foreground">
      {/* Remote media */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        {isVideo && remoteStream ? (
          <Stream stream={remoteStream} className="absolute inset-0 size-full" />
        ) : (
          <div className="flex flex-col items-center gap-5">
            <UserAvatar profile={call.peer} size="xl" />
            <div className="text-center">
              <p className="font-display text-2xl">{call.peer.display_name ?? call.peer.username}</p>
              <p className="mt-1 text-sm text-ink-foreground/60">
                {call.status === "incoming"
                  ? `Incoming ${call.kind} call`
                  : call.status === "outgoing"
                    ? "Calling…"
                    : call.status === "connecting"
                      ? "Connecting…"
                      : call.status === "ended"
                        ? "Call ended"
                        : (elapsed ?? "Connected")}
              </p>
            </div>
          </div>
        )}

        {!isVideo && remoteStream && <Stream stream={remoteStream} className="hidden" />}

        {isVideo && localStream && (
          <div className="absolute right-4 bottom-4 h-40 w-28 overflow-hidden rounded-2xl border border-white/15 bg-black/40">
            <Stream stream={localStream} muted className="size-full" />
          </div>
        )}

        {aiActive && (
          <div className="absolute top-6 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-primary/90 px-4 py-2 text-xs font-medium text-primary-foreground">
            <Sparkle className="size-3.5" />
            {call.aiNotice ?? "AI representation is on this call"}
          </div>
        )}

        {isVideo && elapsed && !aiActive && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 rounded-full bg-black/40 px-3 py-1 text-xs">
            {elapsed}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="border-t border-white/10 px-6 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {call.status === "incoming" ? (
          <div className="mx-auto flex max-w-md flex-col gap-3">
            <div className="flex items-center justify-center gap-6">
              <Button variant="callEnd" size="call" onClick={() => void decline()}>
                <PhoneOff className="size-6" />
              </Button>
              <Button variant="callAnswer" size="call" onClick={() => void answer("human")}>
                <Phone className="size-6" />
              </Button>
            </div>
            {hasStudio && (
              <Button variant="aiSoft" className="w-full" onClick={() => void answer("ai")}>
                <Sparkle className="size-4" /> Let my AI answer
              </Button>
            )}
          </div>
        ) : (
          <div className="mx-auto flex max-w-md flex-col gap-4">
            <div className="flex items-center justify-center gap-4">
              <Button
                variant={micEnabled ? "callControl" : "callControlOff"}
                size="call"
                onClick={toggleMic}
                aria-label={micEnabled ? "Mute" : "Unmute"}
              >
                {micEnabled ? <Mic className="size-5" /> : <MicOff className="size-5" />}
              </Button>
              {isVideo && (
                <Button
                  variant={cameraEnabled ? "callControl" : "callControlOff"}
                  size="call"
                  onClick={toggleCamera}
                  aria-label={cameraEnabled ? "Turn camera off" : "Turn camera on"}
                >
                  {cameraEnabled ? <Video className="size-5" /> : <VideoOff className="size-5" />}
                </Button>
              )}
              <Button variant="callEnd" size="call" onClick={() => void hangUp()} aria-label="End call">
                <PhoneOff className="size-6" />
              </Button>
            </div>

            {canUseAi && !ringing && call.status !== "ended" && (
              <Button
                variant={aiActive ? "secondary" : "aiSoft"}
                className="w-full"
                onClick={() => void switchMode(aiActive ? "human" : "ai")}
              >
                {aiActive ? (
                  <>
                    <User className="size-4" /> Switch back to me
                  </>
                ) : (
                  <>
                    <Sparkle className="size-4" /> Switch to AI
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
