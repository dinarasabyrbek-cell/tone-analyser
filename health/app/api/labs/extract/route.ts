import { serverAsk } from "@/lib/ai";
import { extractLab } from "@/lib/handlers";
import { aiRoute, dataUrlMime, str } from "@/lib/route";

export const maxDuration = 120;

// Body: { file: dataURL (PDF or image), name: string } → normalised lab results for the review screen
export const POST = aiRoute(async (body) => {
  const name = str(body.name, 200) || "report";
  const mime = dataUrlMime(body.file, /^(application\/pdf|image\/(jpeg|png|webp|gif))$/);
  const dataUrl = body.file as string;
  return extractLab(serverAsk, mime === "application/pdf" ? { pdf: { name, dataUrl } } : { images: [dataUrl] });
});
