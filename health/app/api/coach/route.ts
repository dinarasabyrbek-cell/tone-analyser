import { MODEL_FAST, streamText, type AiMessage } from "@/lib/ai";
import { COACH_PROMPT } from "@/lib/prompts";
import { aiRoute, BadRequest, str } from "@/lib/route";

export const maxDuration = 120;

// Body: { context: string, messages: [{ role, content }] } → streamed plain-text answer
export const POST = aiRoute(async (body) => {
  const raw = Array.isArray(body.messages) ? body.messages : [];
  const history: AiMessage[] = raw
    .slice(-20)
    .filter((m): m is { role: "user" | "assistant"; content: string } =>
      !!m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim() !== ""
    )
    .map((m) => ({ role: m.role, content: m.content.slice(0, 8000) }));
  if (!history.length || history[history.length - 1].role !== "user") throw new BadRequest("Missing question");

  const stream = await streamText(MODEL_FAST, [
    { role: "system", content: `${COACH_PROMPT}\n\n---\n${str(body.context)}` },
    ...history,
  ]);
  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
});
