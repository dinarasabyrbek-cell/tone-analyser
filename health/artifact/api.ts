// claude.ai build of lib/client/api: the same endpoints the pages call, answered in the page by the
// viewer's own Claude account (artifact `sample` capability) instead of a server with an API key.
import { analyzeFood, coachRequest, extractLab, healthReview, parseWorkout, testPlan, type Ask } from "@/lib/handlers";
import { capability, type SampleFn } from "./claude";
import { dataUrlBytes, pdfToImages } from "./pdf";
import { storageMode } from "./store";

export const PASSCODE_KEY = "soul-health:passcode";

const OPEN_IN_CLAUDE = "AI works when this page is opened inside Claude (claude.ai or the Claude app).";

const ERRORS: Record<string, string> = {
  not_granted: "You haven't allowed this page to use Claude. Reload the page to be asked again.",
  sampling_disabled: "Claude isn't available for this account.",
  rate_limited: "Claude is busy or your usage limit was reached — try again in a little while.",
  session_expired: "Please sign in to Claude again.",
  image_rejected: "That image couldn't be read — try a different photo (JPG or PNG).",
  images_unavailable: "Photos can't be sent to Claude in this view — try the Claude app or claude.ai.",
  refused: "Claude couldn't help with that input — try rephrasing.",
  prompt_too_large: "That was too much to send at once — try fewer pages.",
  invalid_json: "Claude's answer came back in the wrong format — please try again.",
  empty_completion: "Claude returned an empty answer — please try again.",
  cancelled: "Stopped.",
};

function friendly(e: unknown): Error {
  if (e instanceof Error) return e;
  const code = (e as { code?: string })?.code;
  return new Error((code && ERRORS[code]) || "Claude couldn't answer just now — please try again.");
}

async function sampler(): Promise<SampleFn> {
  const s = await capability<SampleFn>("sample");
  if (!s) throw new Error(OPEN_IN_CLAUDE);
  return s;
}

function toBlob(dataUrl: string): Blob {
  const type = dataUrl.slice(5, dataUrl.indexOf(";")) || "image/jpeg";
  return new Blob([dataUrlBytes(dataUrl) as BlobPart], { type });
}

const ask: Ask = async (req) => {
  const sample = await sampler();
  const images = (req.images ?? []).map(toBlob);
  try {
    const { text } = await sample(`${req.system}\n\n---\n\n${req.text}`, {
      modelTier: req.tier ?? "default",
      ...(images.length ? { images } : {}),
    });
    return text;
  } catch (e) {
    throw friendly(e);
  }
};

async function maxImages(): Promise<number> {
  const s = await sampler();
  const l = await s.limits().catch(() => null);
  if (!l?.images) throw new Error(ERRORS.images_unavailable);
  return Math.max(1, l.images.maxCount);
}

export async function postJSON<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  switch (url) {
    case "/api/labs/extract": {
      const file = str(body.file);
      const limit = await maxImages();
      let images: string[];
      if (file.startsWith("data:application/pdf")) {
        const { images: pages, pages: total } = await pdfToImages(file, Math.min(limit, 8));
        if (!pages.length) throw new Error("This PDF has no pages.");
        if (total > pages.length) console.warn(`Only the first ${pages.length} of ${total} pages were read`);
        images = pages;
      } else images = [file];
      return (await extractLab(ask, { images })) as T;
    }
    case "/api/review":
      return (await healthReview(ask, str(body.context), "Claude (your account)")) as T;
    case "/api/plan":
      return (await testPlan(ask, str(body.context))) as T;
    case "/api/food/analyze":
      return (await analyzeFood(ask, { kind: str(body.kind), image: str(body.image) || undefined, text: str(body.text), context: str(body.context) })) as T;
    case "/api/workout/parse":
      return (await parseWorkout(ask, { text: str(body.text), context: str(body.context) })) as T;
    default:
      throw new Error("Unknown request " + url);
  }
}

/** Coach chat: streams the answer as Claude writes it. */
export async function postStream(url: string, body: Record<string, unknown>, onText: (full: string) => void): Promise<string> {
  if (url !== "/api/coach") throw new Error("Unknown request " + url);
  const { system, history } = coachRequest(typeof body.context === "string" ? body.context : "", body.messages);
  const sample = await sampler();
  try {
    const { text } = await sample([{ role: "user", content: system }, ...history], { cache: false, onText: ({ text }: { text: string }) => onText(text) });
    return text;
  } catch (e) {
    const partial = (e as { text?: string })?.text;
    if (partial) return partial + "\n\n_(answer interrupted)_";
    throw friendly(e);
  }
}

export interface AppStatus {
  ai: boolean;
  cloud: boolean;
  storage?: "account" | "browser";
  aiHint?: string;
  passcode: boolean;
  models: { fast: string; deep: string };
}

let statusPromise: Promise<AppStatus> | null = null;
export function getStatus(): Promise<AppStatus> {
  statusPromise ??= Promise.all([capability<SampleFn>("sample"), storageMode()]).then(([s, storage]) => ({
    ai: Boolean(s),
    cloud: false,
    storage,
    aiHint: OPEN_IN_CLAUDE,
    passcode: false,
    models: { fast: "Claude (your account)", deep: "Claude (your account)" },
  }));
  return statusPromise;
}
