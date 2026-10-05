import { complete, MODEL_FAST } from "@/lib/ai";
import { MUSCLE_IDS } from "@/lib/anatomy";
import { extractJson } from "@/lib/json";
import { WORKOUT_PROMPT } from "@/lib/prompts";
import { aiRoute, BadRequest, str } from "@/lib/route";
import { WorkoutSchema } from "@/lib/schemas";

export const maxDuration = 60;

// Body: { text: string, context?: string } → structured workout
export const POST = aiRoute(async (body) => {
  const text = str(body.text, 500).trim();
  if (!text) throw new BadRequest("Describe the workout");
  const reply = await complete(MODEL_FAST, [
    { role: "system", content: WORKOUT_PROMPT },
    { role: "user", content: `About me:\n${str(body.context, 6000)}\n\nWorkout: ${text}` },
  ], { temperature: 0.2, max_tokens: 800 });
  const parsed = WorkoutSchema.safeParse(extractJson(reply));
  if (!parsed.success) throw new BadRequest("Couldn't understand that workout");
  const muscles = parsed.data.muscles.filter((m) => MUSCLE_IDS.includes(m.id));
  return { ...parsed.data, muscles };
});
