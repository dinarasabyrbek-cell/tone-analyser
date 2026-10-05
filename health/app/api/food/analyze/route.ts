import { complete, MODEL_FAST, type ContentPart } from "@/lib/ai";
import { extractJson } from "@/lib/json";
import { FOOD_PROMPTS } from "@/lib/prompts";
import { aiRoute, BadRequest, dataUrlMime, str } from "@/lib/route";
import { MealSchema, MenuSchema, ReceiptSchema } from "@/lib/schemas";

export const maxDuration = 90;

const SCHEMAS = { meal: MealSchema, menu: MenuSchema, receipt: ReceiptSchema } as const;

// Body: { kind: meal|menu|receipt, image?: dataURL, text?: string, context: string }
export const POST = aiRoute(async (body) => {
  const kind = body.kind as keyof typeof SCHEMAS;
  if (!(kind in SCHEMAS)) throw new BadRequest("Unknown kind");
  const note = str(body.text, 2000);
  const parts: ContentPart[] = [];
  if (body.image) {
    dataUrlMime(body.image, /^image\/(jpeg|png|webp|gif)$/);
    parts.push({ type: "image_url", image_url: { url: body.image as string } });
  }
  if (!parts.length && !note.trim()) throw new BadRequest("Add a photo or a description");
  parts.push({
    type: "text",
    text: `About me:\n${str(body.context)}\n\n${note ? `My note: ${note}` : `Please analyse this ${kind}.`}`,
  });

  const text = await complete(MODEL_FAST, [
    { role: "system", content: FOOD_PROMPTS[kind] },
    { role: "user", content: parts },
  ], { temperature: 0.3 });
  const parsed = SCHEMAS[kind].safeParse(extractJson(text));
  if (!parsed.success) throw new BadRequest("Couldn't analyse that — try a clearer photo.");
  return { result: parsed.data };
});
