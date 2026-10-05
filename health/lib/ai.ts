// Server-only OpenRouter client. The API key never leaves the server (same approach as api/analyse.js).
import "server-only";

const ENDPOINT = (process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1").replace(/\/$/, "") + "/chat/completions";

export const MODEL_FAST = process.env.AI_MODEL_FAST || "anthropic/claude-sonnet-5.5";
export const MODEL_DEEP = process.env.AI_MODEL_DEEP || "anthropic/claude-opus-5.5";

export type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }
  | { type: "file"; file: { filename: string; file_data: string } };

export interface AiMessage {
  role: "system" | "user" | "assistant";
  content: string | ContentPart[];
}

export class AiError extends Error {
  constructor(message: string, public status = 502) {
    super(message);
  }
}

function apiKey(): string {
  const key = (process.env.OPENROUTER_API_KEY || "").trim();
  if (!key) throw new AiError("OPENROUTER_API_KEY is not configured on the server", 500);
  return key;
}

function body(model: string, messages: AiMessage[], extra: Record<string, unknown> = {}) {
  return JSON.stringify({ model, messages, max_tokens: 4000, ...extra });
}

const headers = () => ({
  Authorization: "Bearer " + apiKey(),
  "Content-Type": "application/json",
  "X-Title": "Soul Health",
});

/** One-shot completion returning the text of the first choice. */
export async function complete(model: string, messages: AiMessage[], extra?: Record<string, unknown>): Promise<string> {
  const res = await fetch(ENDPOINT, { method: "POST", headers: headers(), body: body(model, messages, extra) });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new AiError(data?.error?.message || res.statusText || "AI request failed", res.status);
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim()) throw new AiError("The AI returned an empty answer");
  return text;
}

/** Streams plain text deltas from OpenRouter's SSE response. */
export async function streamText(model: string, messages: AiMessage[]): Promise<ReadableStream<Uint8Array>> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: headers(),
    body: body(model, messages, { stream: true }),
  });
  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => null);
    throw new AiError(data?.error?.message || res.statusText || "AI request failed", res.status);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          controller.close();
          return;
        }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        let emitted = false;
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue; // skips ": OPENROUTER PROCESSING" keep-alives
          const payload = trimmed.slice(5).trim();
          if (payload === "[DONE]") {
            controller.close();
            await reader.cancel().catch(() => {});
            return;
          }
          try {
            const json = JSON.parse(payload);
            if (json.error) {
              controller.enqueue(encoder.encode(`\n\n_(error: ${json.error.message || "stream failed"})_`));
              continue;
            }
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) {
              controller.enqueue(encoder.encode(delta));
              emitted = true;
            }
          } catch {
            // partial / non-JSON line — ignore
          }
        }
        if (emitted) return;
      }
    },
    cancel() {
      reader.cancel().catch(() => {});
    },
  });
}

/** OpenRouter-backed implementation of the shared `Ask` interface (see lib/handlers.ts). */
export const serverAsk: import("./handlers").Ask = async (req) => {
  const parts: ContentPart[] = [];
  if (req.pdf) parts.push({ type: "file", file: { filename: req.pdf.name.endsWith(".pdf") ? req.pdf.name : req.pdf.name + ".pdf", file_data: req.pdf.dataUrl } });
  for (const url of req.images ?? []) parts.push({ type: "image_url", image_url: { url } });
  parts.push({ type: "text", text: req.text });
  return complete(req.tier === "complex" ? MODEL_DEEP : MODEL_FAST, [
    { role: "system", content: req.system },
    { role: "user", content: parts.length === 1 ? req.text : parts },
  ], { ...(req.maxTokens ? { max_tokens: req.maxTokens } : {}), ...(req.temperature != null ? { temperature: req.temperature } : {}) });
};
