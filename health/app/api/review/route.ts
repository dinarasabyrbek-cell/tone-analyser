import { complete, MODEL_DEEP } from "@/lib/ai";
import { extractJson } from "@/lib/json";
import { REVIEW_PROMPT } from "@/lib/prompts";
import { aiRoute, BadRequest, str } from "@/lib/route";
import { ReviewSchema } from "@/lib/schemas";

export const maxDuration = 120;

// Body: { context: string } → overall health review
export const POST = aiRoute(async (body) => {
  const context = str(body.context);
  if (!context) throw new BadRequest("Missing context");
  const text = await complete(MODEL_DEEP, [
    { role: "system", content: REVIEW_PROMPT },
    { role: "user", content: context },
  ], { temperature: 0.3 });
  const parsed = ReviewSchema.safeParse(extractJson(text));
  if (!parsed.success) throw new BadRequest("The AI review came back malformed — please try again.");
  const score = parsed.data.score == null ? null : Math.max(0, Math.min(100, Math.round(parsed.data.score)));
  return { ...parsed.data, score, model: MODEL_DEEP };
});
