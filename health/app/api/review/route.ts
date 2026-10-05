import { MODEL_DEEP, serverAsk } from "@/lib/ai";
import { healthReview } from "@/lib/handlers";
import { aiRoute, str } from "@/lib/route";

export const maxDuration = 120;

// Body: { context: string } → overall health review
export const POST = aiRoute((body) => healthReview(serverAsk, str(body.context), MODEL_DEEP));
