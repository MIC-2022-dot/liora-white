/**
 * Liora calling.
 *
 * Real peer-to-peer WebRTC audio/video. Signalling rides Supabase Realtime
 * broadcast on a per-user channel (`liora-call:<userId>`); call records live in
 * `call_history` so history and missed calls survive reloads.
 *
 * AI answering: when the callee has Studio access and an AI representation, the
 * call can be answered or continued by their AI. The call session state is real
 * (the RTCPeerConnection is never torn down when switching), while the audio /
 * video synthesis itself is delegated to the avatar + voice providers through
 * `src/lib/ai/*` — see `startAiSession`.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AiVoiceCall, type AiTurn } from "@/lib/ai/voice-call";

export type CallKind = "voice" | "video";
export type AnswerMode = "human" | "ai";
export type CallStatus = "idle" | "outgoing" | "incoming" | "connecting" | "active" | "ended";

export type CallPeer = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

export type ActiveCall = {
  id: string;
  peer: CallPeer;
  kind: CallKind;
  direction: "outgoing" | "incoming";
  status: CallStatus;
  mode: AnswerMode;
  startedAt: number | null;
  aiNotice: string | null;
};

type CallContextValue = {
  call: ActiveCall | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  micEnabled: boolean;
  cameraEnabled: boolean;
  canUseAi: boolean;
  startCall: (peer: CallPeer, kind: CallKind) => Promise<void>;
  answer: (mode: AnswerMode) => Promise<void>;
  decline: () => Promise<void>;
  hangUp: () => Promise<void>;
  toggleMic: () => void;
  toggleCamera: () => void;
  switchMode: (mode: AnswerMode) => Promise<void>;
};

const CallContext = createContext<CallContextValue | null>(null);

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }],
};

type AiCallSettings = {
  enabled: boolean;
  answer_after_seconds: number;
  voice_calls: boolean;
  video_calls: boolean;
  manual_switching: boolean;
};

export function CallProvider({ children }: { children: ReactNode }) {
  const { user, hasStudio } = useAuth();
  const [call, setCall] = useState<ActiveCall | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [aiSettings, setAiSettings] = useState<AiCallSettings | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const pendingOffer = useRef<RTCSessionDescriptionInit | null>(null);
  const pendingOfferCallId = useRef<string | null>(null);
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);
  const sendChannels = useRef<Map<string, RealtimeChannel>>(new Map());
  const endedRef = useRef(false);
  const localRef = useRef<MediaStream | null>(null);
  const autoAnswerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callRef = useRef<ActiveCall | null>(null);
  callRef.current = call;

  const aiVoiceRef = useRef<AiVoiceCall | null>(null);

  const canUseAi = hasStudio;

  useEffect(() => {
    const aiVoice = aiVoiceRef.current;
    if (!aiVoice) return;
    return () => {
      void aiVoice.stop();
      aiVoiceRef.current = null;
    };
  }, [call?.mode]);

  useEffect(() => {
    if (!remoteStream || !call || call.mode !== "ai") return;
    if (aiVoiceRef.current) return;
    const pc = pcRef.current;
    if (!pc) return;

    const aiVoice = new AiVoiceCall(pc, {
      onTurn: (turn: AiTurn) => {
        console.log("[LIORA AI]", turn);
      },
      onError: (message: string) => {
        console.error("[LIORA AI Voice]", message);
      },
    });

    void aiVoice.start(remoteStream).then(() => {
      aiVoiceRef.current = aiVoice;
    });
  }, [remoteStream, call?.mode]);

  const send = useCallback(async (toUserId: string, event: string, payload: unknown) => {
    let ch = sendChannels.current.get(toUserId);
    if (!ch) {
      ch = supabase.channel(`liora-call:${toUserId}`);
      await ch.subscribe();
      sendChannels.current.set(toUserId, ch);
    }
    await ch.send({ type: "broadcast", event, payload });
  }, []);

  const cleanup = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;

    if (autoAnswerTimer.current) clearTimeout(autoAnswerTimer.current);
    autoAnswerTimer.current = null;

    try {
      pcRef.current?.close();
    } catch {
      // ignore
    }
    pcRef.current = null;

    localRef.current?.getTracks().forEach((t) => t.stop());
    localRef.current = null;

    pendingOffer.current = null;
    pendingOfferCallId.current = null;
    pendingCandidates.current = [];

    for (const ch of sendChannels.current.values()) {
      try {
        void supabase.removeChannel(ch);
      } catch {
        // ignore
      }
    }
    sendChannels.current.clear();

    setLocalStream(null);
    setRemoteStream(null);
    setMicEnabled(true);
    setCameraEnabled(true);
  }, []);

  const endLocal = useCallback(() => {
    if (endedRef.current) return;
    cleanup();
    setCall((c) => (c ? { ...c, status: "ended" } : null));
    setTimeout(() => setCall(null), 1200);
  }, [cleanup]);

  const buildPeerConnection = useCallback(
    (peerId: string, callId: string) => {
      const pc = new RTCPeerConnection(ICE_SERVERS);
      pc.onicecandidate = (e) => {
        if (e.candidate) void send(peerId, "ice", { callId, candidate: e.candidate.toJSON() });
      };
      pc.ontrack = (e) => {
        const [stream] = e.streams;
        if (stream) setRemoteStream(stream);
      };

      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        console.log("[LIORA WebRTC] Connection state:", state);
        if (state === "connected") {
          console.log("[LIORA WebRTC] Call connection established");
          setCall((c) =>
            c
              ? {
                  ...c,
                  status: "active",
                  startedAt: c.startedAt ?? Date.now(),
                }
              : c,
          );
          return;
        }
        if (state === "connecting") {
          console.log("[LIORA WebRTC] Connecting...");
          return;
        }
        if (state === "failed") {
          console.error("[LIORA WebRTC] Peer connection FAILED");
          endLocal();
          return;
        }
        if (state === "disconnected") {
          console.warn("[LIORA WebRTC] Temporarily disconnected — allowing recovery");
          return;
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log("[LIORA WebRTC] ICE connection state:", pc.iceConnectionState);
        if (pc.iceConnectionState === "connected") {
          console.log("[LIORA WebRTC] ICE connected");
        }
        if (pc.iceConnectionState === "completed") {
          console.log("[LIORA WebRTC] ICE completed");
        }
        if (pc.iceConnectionState === "checking") {
          console.log("[LIORA WebRTC] ICE checking...");
        }
        if (pc.iceConnectionState === "disconnected") {
          console.warn("[LIORA WebRTC] ICE temporarily disconnected");
        }
        if (pc.iceConnectionState === "failed") {
          console.error("[LIORA WebRTC] ICE FAILED");
        }
      };

      pc.onsignalingstatechange = () => {
        console.log("[LIORA WebRTC] Signaling state:", pc.signalingState);
      };
      pcRef.current = pc;
      return pc;
    },
    [send, endLocal],
  );

  const getMedia = useCallback(async (kind: CallKind) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: kind === "video",
    });
    localRef.current = stream;
    setLocalStream(stream);
    return stream;
  }, []);

  useEffect(() => {
    if (!user || !hasStudio) {
      setAiSettings(null);
      return;
    }
    void supabase
      .from("ai_call_settings")
      .select("enabled, answer_after_seconds, voice_calls, video_calls, manual_switching")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setAiSettings((data as AiCallSettings) ?? null));
  }, [user, hasStudio]);

  const answerRef = useRef<(mode: AnswerMode) => Promise<void>>(async () => {});

  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel(`liora-call:${user.id}`);

    channel
      .on("broadcast", { event: "invite" }, async ({ payload }) => {
        const p = payload as {
          callId: string;
          kind: CallKind;
          offer: RTCSessionDescriptionInit;
          peer: CallPeer;
        };
        if (callRef.current) {
          void send(p.peer.id, "busy", { callId: p.callId });
          return;
        }
        pendingOffer.current = p.offer;
        pendingOfferCallId.current = p.callId;
        endedRef.current = false;
        setCall({
          id: p.callId,
          peer: p.peer,
          kind: p.kind,
          direction: "incoming",
          status: "incoming",
          mode: "human",
          startedAt: null,
          aiNotice: null,
        });
      })
      .on("broadcast", { event: "answer" }, async ({ payload }) => {
        const p = payload as { callId?: string; answer: RTCSessionDescriptionInit; mode: AnswerMode };
        if (!p.callId || p.callId !== callRef.current?.id) return;
        const pc = pcRef.current;
        if (!pc) return;
        await pc.setRemoteDescription(new RTCSessionDescription(p.answer));
        for (const c of pendingCandidates.current) await pc.addIceCandidate(c);
        pendingCandidates.current = [];
        setCall((c) => (c ? { ...c, status: "active", startedAt: Date.now() } : c));
      })
      .on("broadcast", { event: "ice" }, async ({ payload }) => {
        const p = payload as { callId?: string; candidate: RTCIceCandidateInit };
        if (!p.callId || p.callId !== callRef.current?.id) return;
        const pc = pcRef.current;
        if (!pc) return;
        if (pc.remoteDescription) await pc.addIceCandidate(p.candidate);
        else pendingCandidates.current.push(p.candidate);
      })
      .on("broadcast", { event: "decline" }, ({ payload }) => {
        const p = payload as { callId?: string };
        if (!p.callId || p.callId !== callRef.current?.id) return;
        toast.info("Call declined");
        endLocal();
      })
      .on("broadcast", { event: "busy" }, ({ payload }) => {
        const p = payload as { callId?: string };
        if (!p.callId || p.callId !== callRef.current?.id) return;
        toast.info("They're on another call");
        endLocal();
      })
      .on("broadcast", { event: "end" }, ({ payload }) => {
        const p = payload as { callId?: string };
        if (!p.callId || p.callId !== callRef.current?.id) return;
        endLocal();
      })
      .on("broadcast", { event: "mode" }, ({ payload }) => {
        const p = payload as { callId?: string; mode: AnswerMode; name: string | null };
        if (!p.callId || p.callId !== callRef.current?.id) return;
        setCall((c) =>
          c
            ? {
                ...c,
                mode: p.mode,
                aiNotice: p.mode === "ai" ? `${p.name ?? "Their"} AI representation is speaking` : null,
              }
            : c,
        );
      })
      .subscribe();

    channelRef.current = channel;
    return () => {
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [user, send, endLocal]);

  useEffect(() => {
    if (!call || call.direction !== "incoming" || call.status !== "incoming") return;
    if (!hasStudio || !aiSettings?.enabled) return;
    const allowed = call.kind === "voice" ? aiSettings.voice_calls : aiSettings.video_calls;
    if (!allowed) return;
    autoAnswerTimer.current = setTimeout(
      () => void answerRef.current("ai"),
      Math.max(3, aiSettings.answer_after_seconds) * 1000,
    );
    return () => {
      if (autoAnswerTimer.current) clearTimeout(autoAnswerTimer.current);
    };
  }, [call, hasStudio, aiSettings]);

  const startCall = useCallback(
    async (peer: CallPeer, kind: CallKind) => {
      if (!user) return;
      try {
        const { data: row, error } = await supabase
          .from("call_history")
          .insert({ caller_id: user.id, callee_id: peer.id, kind, status: "ringing" })
          .select("id")
          .single();
        if (error) throw error;

        const stream = await getMedia(kind);
        const pc = buildPeerConnection(peer.id, row.id);
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const { data: me } = await supabase
          .from("profiles")
          .select("id, display_name, username, avatar_url")
          .eq("id", user.id)
          .maybeSingle();

        endedRef.current = false;
        setCall({
          id: row.id,
          peer,
          kind,
          direction: "outgoing",
          status: "outgoing",
          mode: "human",
          startedAt: null,
          aiNotice: null,
        });
        await send(peer.id, "invite", { callId: row.id, kind, offer, peer: me });
      } catch (err) {
        cleanup();
        setCall(null);
        toast.error(
          err instanceof Error ? err.message : "Could not start the call. Check your microphone.",
        );
      }
    },
    [user, getMedia, buildPeerConnection, send, cleanup],
  );

  const answer = useCallback(
    async (mode: AnswerMode) => {
      const current = callRef.current;
      if (!current || !pendingOffer.current || !user) return;
      if (pendingOfferCallId.current && pendingOfferCallId.current !== current.id) return;
      if (autoAnswerTimer.current) clearTimeout(autoAnswerTimer.current);
      try {
        endedRef.current = false;
        setCall({ ...current, status: "connecting", mode });
        const pc = buildPeerConnection(current.peer.id, current.id);
        const stream = await getMedia(current.kind);
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));

        if (mode === "ai") {
          stream.getTracks().forEach((t) => (t.enabled = false));
          setMicEnabled(false);
          setCameraEnabled(false);
        }

        await pc.setRemoteDescription(new RTCSessionDescription(pendingOffer.current));
        const localAnswer = await pc.createAnswer();
        await pc.setLocalDescription(localAnswer);
        for (const c of pendingCandidates.current) await pc.addIceCandidate(c);
        pendingCandidates.current = [];

        await send(current.peer.id, "answer", { callId: current.id, answer: localAnswer, mode });
        await supabase
          .from("call_history")
          .update({
            status: "answered",
            answered_mode: mode,
            answered_at: new Date().toISOString(),
          })
          .eq("id", current.id);

        let notice: string | null = null;
        if (mode === "ai") {
          notice = null;
          await send(current.peer.id, "mode", { callId: current.id, mode: "ai", name: null });
        }
        setCall((c) =>
          c ? { ...c, status: "active", mode, startedAt: Date.now(), aiNotice: notice } : c,
        );
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not answer the call");
        endLocal();
      }
    },
    [user, buildPeerConnection, getMedia, send, endLocal],
  );
  answerRef.current = answer;

  const decline = useCallback(async () => {
    const current = callRef.current;
    if (!current) return;
    await send(current.peer.id, "decline", { callId: current.id });
    await supabase.from("call_history").update({ status: "declined" }).eq("id", current.id);
    endLocal();
  }, [send, endLocal]);

  const hangUp = useCallback(async () => {
    const current = callRef.current;
    if (!current) return;
    await send(current.peer.id, "end", { callId: current.id });
    const seconds = current.startedAt ? Math.round((Date.now() - current.startedAt) / 1000) : null;
    await supabase
      .from("call_history")
      .update({
        status: current.startedAt ? "ended" : "missed",
        ended_at: new Date().toISOString(),
        duration_seconds: seconds,
      })
      .eq("id", current.id);
    endLocal();
  }, [send, endLocal]);

  const toggleMic = useCallback(() => {
    const track = localRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMicEnabled(track.enabled);
  }, []);

  const toggleCamera = useCallback(() => {
    const track = localRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setCameraEnabled(track.enabled);
  }, []);

  const switchMode = useCallback(
    async (mode: AnswerMode) => {
      const current = callRef.current;
      if (!current) return;
      const notice: string | null = null;
      if (mode === "ai") {
        localRef.current?.getTracks().forEach((t) => (t.enabled = false));
        setMicEnabled(false);
        setCameraEnabled(false);
      } else {
        await aiVoiceRef.current?.stop();
        aiVoiceRef.current = null;
        localRef.current?.getTracks().forEach((t) => (t.enabled = true));
        setMicEnabled(true);
        setCameraEnabled(current.kind === "video");
      }
      setCall((c) => (c ? { ...c, mode, aiNotice: notice } : c));
      await send(current.peer.id, "mode", { callId: current.id, mode, name: null });
    },
    [send],
  );

  const value = useMemo<CallContextValue>(
    () => ({
      call,
      localStream,
      remoteStream,
      micEnabled,
      cameraEnabled,
      canUseAi,
      startCall,
      answer,
      decline,
      hangUp,
      toggleMic,
      toggleCamera,
      switchMode,
    }),
    [
      call,
      localStream,
      remoteStream,
      micEnabled,
      cameraEnabled,
      canUseAi,
      startCall,
      answer,
      decline,
      hangUp,
      toggleMic,
      toggleCamera,
      switchMode,
    ],
  );

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall must be used inside CallProvider");
  return ctx;
}
