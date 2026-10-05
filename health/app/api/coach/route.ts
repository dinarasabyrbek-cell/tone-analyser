import { MODEL_FAST, streamText } from "@/lib/ai";
import { coachRequest } from "@/lib/handlers";
import { aiRoute, str } from "@/lib/route";

export const maxDuration = 120;

// Body: { context: string, messages: [{ role, content }] } → streamed plain-text answer
export const POST = aiRoute(async (body) => {
  const { system, history } = coachRequest(str(body.context), body.messages);
  const stream = await streamText(MODEL_FAST, [{ role: "system", content: system }, ...history]);
  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
});
