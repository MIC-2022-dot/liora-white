/**
 * Live spoken AI on a WebRTC call.
 *
 * Pipeline: caller audio -> voice-activity windowing -> WAV -> speech-to-text
 * -> the owner's trained reply engine -> ElevenLabs speech -> injected back
 * into the same peer connection as the outbound audio track. The owner's mic
 * track is restored untouched when the AI stops.
 */
import { blobToBase64, encodeWav, rms } from "@/lib/ai/wav";
import { aiChannelReply, transcribeSpeech } from "@/lib/ai-runtime.functions";
import { generateAiSpeech } from "@/lib/ai/elevenlabs";

export type AiTurn = { role: "caller" | "ai"; text: string; at: number };

type Events = {
  onTurn?: (turn: AiTurn) => void;
  onError?: (message: string) => void;
};

const SPEECH_THRESHOLD = 0.018;
const SILENCE_MS = 900;
const MIN_SPEECH_MS = 350;
const MAX_UTTERANCE_MS = 15000;

export class AiVoiceCall {
  private ctx: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private dest: MediaStreamAudioDestinationNode | null = null;
  private sender: RTCRtpSender | null = null;
  private originalTrack: MediaStreamTrack | null = null;
  private chunks: Float32Array[] = [];
  private speaking = false;
  private speechMs = 0;
  private silenceMs = 0;
  private busy = false;
  private stopped = false;
  private history: { role: "user" | "assistant"; content: string }[] = [];

  constructor(
    private pc: RTCPeerConnection,
    private events: Events = {},
  ) {}

  async start(remote: MediaStream) {
    const AudioCtor: typeof AudioContext =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtor();
    this.ctx = ctx;
    if (ctx.state === "suspended") await ctx.resume();

    this.dest = ctx.createMediaStreamDestination();
    const outTrack = this.dest.stream.getAudioTracks()[0] ?? null;
    this.sender = this.pc.getSenders().find((s) => s.track?.kind === "audio") ?? null;
    if (this.sender && outTrack) {
      this.originalTrack = this.sender.track;
      await this.sender.replaceTrack(outTrack);
    }

    this.source = ctx.createMediaStreamSource(remote);
    const processor = ctx.createScriptProcessor(4096, 1, 1);
    this.processor = processor;
    const frameMs = (4096 / ctx.sampleRate) * 1000;

    processor.onaudioprocess = (event) => {
      if (this.stopped || this.busy) return;
      const input = event.inputBuffer.getChannelData(0);
      const level = rms(input);

      if (level > SPEECH_THRESHOLD) {
        this.speaking = true;
        this.silenceMs = 0;
        this.speechMs += frameMs;
        this.chunks.push(new Float32Array(input));
      } else if (this.speaking) {
        this.silenceMs += frameMs;
        this.chunks.push(new Float32Array(input));
        if (this.silenceMs >= SILENCE_MS) this.flush();
      }

      if (this.speaking && this.speechMs >= MAX_UTTERANCE_MS) this.flush();
    };

    this.source.connect(processor);
    processor.connect(ctx.destination);
  }

  private flush() {
    const chunks = this.chunks;
    const enough = this.speechMs >= MIN_SPEECH_MS;
    this.chunks = [];
    this.speaking = false;
    this.speechMs = 0;
    this.silenceMs = 0;
    if (!enough || !this.ctx) return;
    this.busy = true;
    void this.handleUtterance(chunks, this.ctx.sampleRate).finally(() => {
      this.busy = false;
    });
  }

  private async handleUtterance(chunks: Float32Array[], sampleRate: number) {
    try {
      const wav = encodeWav(chunks, sampleRate);
      if (wav.size < 2048) return;
      const audioBase64 = await blobToBase64(wav);
      const { text } = await transcribeSpeech({ data: { audioBase64, mimeType: "audio/wav" } });
      if (this.stopped || !text) return;

      this.events.onTurn?.({ role: "caller", text, at: Date.now() });
      this.history = [...this.history, { role: "user", content: text }].slice(-20);

      const { reply } = await aiChannelReply({
        data: { channel: "call", messages: this.history },
      });
      if (this.stopped || !reply) return;

      this.history = [...this.history, { role: "assistant", content: reply }].slice(-20);
      this.events.onTurn?.({ role: "ai", text: reply, at: Date.now() });

      await this.speak(reply);
    } catch (err) {
      this.events.onError?.(err instanceof Error ? err.message : "AI voice turn failed");
    }
  }

  private async speak(text: string) {
    const ctx = this.ctx;
    const dest = this.dest;
    if (!ctx || !dest) return;
    const { blob, url } = await generateAiSpeech(text);
    try {
      const buffer = await ctx.decodeAudioData(await blob.arrayBuffer());
      await new Promise<void>((resolve) => {
        const node = ctx.createBufferSource();
        node.buffer = buffer;
        node.connect(dest);
        node.connect(ctx.destination);
        node.onended = () => resolve();
        node.start();
      });
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async stop() {
    if (this.stopped) return;
    this.stopped = true;
    try {
      this.processor?.disconnect();
      this.source?.disconnect();
    } catch {
      /* nodes already torn down */
    }
    if (this.sender && this.originalTrack) {
      try {
        await this.sender.replaceTrack(this.originalTrack);
      } catch {
        /* the call may already be gone */
      }
    }
    try {
      await this.ctx?.close();
    } catch {
      /* ignore */
    }
    this.ctx = null;
    this.processor = null;
    this.source = null;
    this.dest = null;
  }
}
