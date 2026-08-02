// Supabase Edge Function: ElevenLabs TTS proxy
// Reads ELEVENLABS_API_KEY from environment (Supabase secret) and forwards voice requests.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve(async (req) => {
  try {
    const env = Deno.env;
    const key = Deno.env.get("ELEVENLABS_API_KEY");

console.log(
  "[ElevenLabs]",
  key ? "API key found" : "API key NOT found",
);
    if (!key) {
      return new Response(
        JSON.stringify({ error: "Missing server configuration: ELEVENLABS_API_KEY" }),
        {
          status: 500,
        },
      );
    }

    if (req.method === "GET") {
      const resp = await fetch("https://api.elevenlabs.io/v1/voices", {
        method: "GET",
        headers: {
          "xi-api-key": key,
          Accept: "application/json",
        },
      });
      if (!resp.ok) {
        const textBody = await resp.text();
        return new Response(
          JSON.stringify({
            error: "ElevenLabs list voices error",
            status: resp.status,
            body: textBody,
          }),
          { status: 502 },
        );
      }
      const json = await resp.json();
      const voices = Array.isArray(json.voices) ? json.voices : json;
      return new Response(JSON.stringify({ voices }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Only GET and POST allowed" }), { status: 405 });
    }

    type ElevenLabsRequestBody = {
      text?: string;
      voiceId?: string;
      modelId?: string;
    };

    let body: ElevenLabsRequestBody;
    try {
      body = (await req.json()) as ElevenLabsRequestBody;
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 });
    }

    const text = (body?.text ?? "").toString();
    if (!text || text.trim().length === 0) {
      return new Response(JSON.stringify({ error: "'text' is required" }), { status: 400 });
    }

    const voiceId = body?.voiceId?.toString();
    if (!voiceId) {
      return new Response(JSON.stringify({ error: "'voiceId' is required" }), { status: 400 });
    }

    const modelId = body?.modelId?.toString();
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`;
    const payload: { text: string; model?: string } = { text };
    if (modelId) payload.model = modelId;

    const resp = await fetch(url, {
      method: "POST",
      headers: {
  "Content-Type": "application/json",
  "xi-api-key": key,
  Accept: "audio/mpeg",
},
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const textBody = await resp.text();
      return new Response(
        JSON.stringify({ error: "ElevenLabs error", status: resp.status, body: textBody }),
        {
          status: 502,
        },
      );
    }

    const audioBuffer = await resp.arrayBuffer();
    const u8 = new Uint8Array(audioBuffer);
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < u8.length; i += chunk) {
      const slice = u8.subarray(i, i + chunk);
      binary += String.fromCharCode(...slice);
    }
    const base64 = btoa(binary);

    return new Response(JSON.stringify({ audio: base64, mime: "audio/mpeg" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("ElevenLabs function error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
});
