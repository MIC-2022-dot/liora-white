import { GoogleGenAI } from "@google/genai";

type GeminiMessage = { role: "user" | "assistant"; content: string };

type GeminiTextResponse = { text: string };

type GeminiContentResponse = {
  text?: string | null;
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string | null }> };
  }>;
};

export function requireGeminiApiKey(apiKey?: string) {
  const resolved = apiKey ?? process.env["GEMINI_API_KEY"];
  if (!resolved) throw new Error("Gemini API key is not configured.");
  return resolved;
}

export function getGeminiModelName(model?: string) {
  return model?.trim() || process.env["GEMINI_MODEL"]?.trim() || "gemini-2.5-flash";
}

function mapGeminiError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (
    lower.includes("api key") ||
    lower.includes("authentication") ||
    lower.includes("permission denied") ||
    lower.includes("401")
  ) {
    return new Error("Gemini authentication failed. Check your API key.");
  }

  if (lower.includes("quota") || lower.includes("resource exhausted") || lower.includes("429")) {
    return new Error("Gemini quota exceeded. Please try again later.");
  }

  if (lower.includes("rate limit") || lower.includes("too many requests")) {
    return new Error("Gemini rate limit reached. Please try again in a moment.");
  }

  if (
    lower.includes("model") &&
    (lower.includes("not found") || lower.includes("unsupported") || lower.includes("unavailable"))
  ) {
    return new Error("The selected Gemini model is unavailable. Please try again later or use a different model.");
  }

  if (
    lower.includes("fetch failed") ||
    lower.includes("network") ||
    lower.includes("timeout") ||
    lower.includes("timed out") ||
    lower.includes("econnreset") ||
    lower.includes("enotfound") ||
    lower.includes("socket")
  ) {
    return new Error("Gemini request failed due to a network or timeout issue. Please try again.");
  }

  return new Error(`Gemini request failed: ${message}`);
}

function extractText(response: GeminiContentResponse) {
  if (typeof response.text === "string" && response.text.trim()) return response.text.trim();

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  return parts
    .map((part) => part.text ?? "")
    .join("")
    .trim();
}

export async function generateGeminiText(input: {
  apiKey?: string;
  model?: string;
  systemInstruction: string;
  messages: GeminiMessage[];
}) {
  const ai = new GoogleGenAI({ apiKey: requireGeminiApiKey(input.apiKey) });
  const prompt = [
    input.systemInstruction,
    ...input.messages.map((message) => `${message.role === "assistant" ? "Assistant" : "User"}: ${message.content}`),
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const response = await ai.models.generateContent({
      model: getGeminiModelName(input.model),
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    return { text: extractText(response as GeminiContentResponse) } satisfies GeminiTextResponse;
  } catch (error) {
    throw mapGeminiError(error);
  }
}

export async function transcribeGeminiAudio(input: {
  apiKey?: string;
  model?: string;
  audioBase64: string;
  mimeType?: string;
}) {
  const ai = new GoogleGenAI({ apiKey: requireGeminiApiKey(input.apiKey) });
  const decodedBytes = Buffer.from(input.audioBase64, "base64");
  if (decodedBytes.length < 2048) return { text: "" } satisfies GeminiTextResponse;

  try {
    const response = await ai.models.generateContent({
      model: getGeminiModelName(input.model),
      contents: [
        {
          role: "user",
          parts: [
            { text: "Transcribe the speech in this audio recording." },
            {
              inlineData: {
                mimeType: input.mimeType ?? "audio/wav",
                data: input.audioBase64,
              },
            },
          ],
        },
      ],
    });

    return { text: extractText(response as GeminiContentResponse) } satisfies GeminiTextResponse;
  } catch (error) {
    throw mapGeminiError(error);
  }
}
