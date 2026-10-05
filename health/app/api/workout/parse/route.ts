import { serverAsk } from "@/lib/ai";
import { parseWorkout } from "@/lib/handlers";
import { aiRoute, str } from "@/lib/route";

export const maxDuration = 60;

// Body: { text: string, context?: string } → structured workout
export const POST = aiRoute((body) => parseWorkout(serverAsk, { text: str(body.text, 500), context: str(body.context, 6000) }));
