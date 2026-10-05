import { complete, MODEL_FAST, type ContentPart } from "@/lib/ai";
import { extractJson } from "@/lib/json";
import { extractionToResults, normalizeDate } from "@/lib/normalize";
import { EXTRACT_PROMPT } from "@/lib/prompts";
import { aiRoute, BadRequest, dataUrlMime, str } from "@/lib/route";
import { ExtractionSchema } from "@/lib/schemas";

export const maxDuration = 120;

// Body: { file: dataURL (PDF or image), name: string } → normalised lab results for the review screen
export const POST = aiRoute(async (body) => {
  const name = str(body.name, 200) || "report";
  const mime = dataUrlMime(body.file, /^(application\/pdf|image\/(jpeg|png|webp|gif))$/);
  const data = body.file as string;
  const filePart: ContentPart =
    mime === "application/pdf"
      ? { type: "file", file: { filename: name.endsWith(".pdf") ? name : name + ".pdf", file_data: data } }
      : { type: "image_url", image_url: { url: data } };

  const text = await complete(MODEL_FAST, [
    { role: "system", content: EXTRACT_PROMPT },
    { role: "user", content: [filePart, { type: "text", text: "Extract every numeric lab result from this report." }] },
  ], { max_tokens: 8000, temperature: 0 });

  const parsed = ExtractionSchema.safeParse(extractJson(text));
  if (!parsed.success) throw new BadRequest("Could not read results from this file. Try a clearer photo or the original PDF.");
  const results = extractionToResults(parsed.data);
  if (!results.length) throw new BadRequest("No numeric lab results were found in this file.");
  return {
    taken_at: normalizeDate(parsed.data.taken_at),
    lab_name: parsed.data.lab_name,
    notes: parsed.data.notes,
    results,
  };
});
