// AI features as plain functions over an `Ask` backend, shared by the server routes (OpenRouter)
// and the claude.ai artifact build (the viewer's own Claude account via `sample`).
import { MUSCLE_IDS } from "./anatomy";
import { extractJson } from "./json";
import { extractionToResults, normalizeDate } from "./normalize";
import { COACH_PROMPT, EXTRACT_PROMPT, FOOD_PROMPTS, PLAN_PROMPT, REVIEW_PROMPT, WORKOUT_PROMPT } from "./prompts";
import { ExtractionSchema, MealSchema, MenuSchema, PlanSchema, ReceiptSchema, ReviewSchema, WorkoutSchema } from "./schemas";

export type Tier = "quick" | "default" | "complex";

export interface AskRequest {
  system: string;
  text: string;
  /** image data URLs */
  images?: string[];
  /** a PDF as data URL (only backends that read PDFs natively; others convert to images first) */
  pdf?: { name: string; dataUrl: string };
  tier?: Tier;
  maxTokens?: number;
  temperature?: number;
}

export type Ask = (req: AskRequest) => Promise<string>;

/** A problem with the input or the AI's answer — shown to the user as-is. */
export class HandlerError extends Error {
  status = 400;
}

const parse = <T>(schema: { safeParse: (v: unknown) => { success: true; data: T } | { success: false } }, text: string, msg: string): T => {
  let raw: unknown;
  try {
    raw = extractJson(text);
  } catch {
    throw new HandlerError(msg);
  }
  const r = schema.safeParse(raw);
  if (!r.success) throw new HandlerError(msg);
  return r.data;
};

export async function extractLab(ask: Ask, input: { images?: string[]; pdf?: { name: string; dataUrl: string } }) {
  const text = await ask({
    system: EXTRACT_PROMPT,
    text: "Extract every numeric lab result from this report" + (input.images && input.images.length > 1 ? ` (${input.images.length} pages, in order).` : "."),
    images: input.images,
    pdf: input.pdf,
    tier: "default",
    maxTokens: 8000,
    temperature: 0,
  });
  const data = parse(ExtractionSchema, text, "Could not read results from this file. Try a clearer photo or the original PDF.");
  const results = extractionToResults(data);
  if (!results.length) throw new HandlerError("No numeric lab results were found in this file.");
  return { taken_at: normalizeDate(data.taken_at), lab_name: data.lab_name, notes: data.notes, results };
}

export async function healthReview(ask: Ask, context: string, model = "") {
  if (!context) throw new HandlerError("Missing context");
  const text = await ask({ system: REVIEW_PROMPT, text: context, tier: "complex", temperature: 0.3 });
  const data = parse(ReviewSchema, text, "The AI review came back malformed — please try again.");
  const score = data.score == null ? null : Math.max(0, Math.min(100, Math.round(data.score)));
  return { ...data, score, model };
}

export async function testPlan(ask: Ask, context: string) {
  if (!context) throw new HandlerError("Missing context");
  const text = await ask({ system: PLAN_PROMPT, text: context, tier: "default", temperature: 0.2 });
  const data = parse(PlanSchema, text, "The AI plan came back empty — please try again.");
  const items = data.items.filter((i) => i.name);
  if (!items.length) throw new HandlerError("The AI plan came back empty — please try again.");
  return { items };
}

const FOOD_SCHEMAS = { meal: MealSchema, menu: MenuSchema, receipt: ReceiptSchema } as const;

export async function analyzeFood(ask: Ask, input: { kind: string; image?: string; text: string; context: string }) {
  const kind = input.kind as keyof typeof FOOD_SCHEMAS;
  if (!(kind in FOOD_SCHEMAS)) throw new HandlerError("Unknown kind");
  const note = input.text.slice(0, 2000);
  if (!input.image && !note.trim()) throw new HandlerError("Add a photo or a description");
  const text = await ask({
    system: FOOD_PROMPTS[kind],
    text: `About me:\n${input.context}\n\n${note ? `My note: ${note}` : `Please analyse this ${kind} (see the photo).`}`,
    images: input.image ? [input.image] : undefined,
    tier: "default",
    temperature: 0.3,
  });
  const result = parse(FOOD_SCHEMAS[kind] as typeof MealSchema, text, "Couldn't analyse that — try a clearer photo.");
  return { result };
}

export async function parseWorkout(ask: Ask, input: { text: string; context: string }) {
  const t = input.text.slice(0, 500).trim();
  if (!t) throw new HandlerError("Describe the workout");
  const reply = await ask({
    system: WORKOUT_PROMPT,
    text: `About me:\n${input.context.slice(0, 6000)}\n\nWorkout: ${t}`,
    tier: "quick",
    temperature: 0.2,
    maxTokens: 800,
  });
  const data = parse(WorkoutSchema, reply, "Couldn't understand that workout");
  return { ...data, muscles: data.muscles.filter((m) => MUSCLE_IDS.includes(m.id)) };
}

export type ChatTurn = { role: "user" | "assistant"; content: string };

/** Cleans the chat history and returns the coach's standing instructions. */
export function coachRequest(context: string, messages: unknown): { system: string; history: ChatTurn[] } {
  const raw = Array.isArray(messages) ? messages : [];
  const history: ChatTurn[] = raw
    .slice(-20)
    .filter((m): m is ChatTurn => !!m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim() !== "")
    .map((m) => ({ role: m.role, content: m.content.slice(0, 8000) }));
  if (!history.length || history[history.length - 1].role !== "user") throw new HandlerError("Missing question");
  return { system: `${COACH_PROMPT}\n\n---\n${context}`, history };
}
