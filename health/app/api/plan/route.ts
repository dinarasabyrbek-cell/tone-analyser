import { serverAsk } from "@/lib/ai";
import { testPlan } from "@/lib/handlers";
import { aiRoute, str } from "@/lib/route";

export const maxDuration = 90;

// Body: { context: string } → personalised testing schedule
export const POST = aiRoute((body) => testPlan(serverAsk, str(body.context)));
