import { serverAsk } from "@/lib/ai";
import { analyzeFood } from "@/lib/handlers";
import { aiRoute, dataUrlMime, str } from "@/lib/route";

export const maxDuration = 90;

// Body: { kind: meal|menu|receipt, image?: dataURL, text?: string, context: string }
export const POST = aiRoute(async (body) => {
  if (body.image) dataUrlMime(body.image, /^image\/(jpeg|png|webp|gif)$/);
  return analyzeFood(serverAsk, { kind: String(body.kind), image: body.image as string | undefined, text: str(body.text, 2000), context: str(body.context) });
});
