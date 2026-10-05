import { complete, MODEL_FAST } from "@/lib/ai";
import { extractJson } from "@/lib/json";
import { PLAN_PROMPT } from "@/lib/prompts";
import { aiRoute, BadRequest, str } from "@/lib/route";
import { PlanSchema } from "@/lib/schemas";

export const maxDuration = 90;

// Body: { context: string } → personalised testing schedule
export const POST = aiRoute(async (body) => {
  const context = str(body.context);
  if (!context) throw new BadRequest("Missing context");
  const text = await complete(MODEL_FAST, [
    { role: "system", content: PLAN_PROMPT },
    { role: "user", content: context },
  ], { temperature: 0.2 });
  const parsed = PlanSchema.safeParse(extractJson(text));
  if (!parsed.success || !parsed.data.items.length) throw new BadRequest("The AI plan came back empty — please try again.");
  return { items: parsed.data.items.filter((i) => i.name) };
});
