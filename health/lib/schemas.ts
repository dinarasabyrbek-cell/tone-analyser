// Lenient validators for AI JSON output: coerce numbers, default missing fields, drop junk.
import { z } from "zod";

/** "5,4" → 5.4, "<0.5" → 0.5, "" / null / garbage → null */
export const looseNumber = z.preprocess((v) => {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const m = v.replace(",", ".").match(/-?\d+(\.\d+)?/);
    return m ? Number(m[0]) : null;
  }
  return null;
}, z.number().nullable());

const str = z.preprocess((v) => (v == null ? "" : String(v)), z.string());
const strList = z.preprocess(
  (v) => (Array.isArray(v) ? v.filter((x) => x != null).map(String) : []),
  z.array(z.string())
);
const arr = <T extends z.ZodType>(item: T) =>
  z
    .preprocess((v) => (Array.isArray(v) ? v : []), z.array(item.nullable().catch(null)))
    .transform((xs) => xs.filter((x): x is NonNullable<typeof x> => x != null));

export const ExtractionSchema = z.object({
  taken_at: str, // YYYY-MM-DD
  lab_name: str,
  notes: str,
  results: arr(
    z.object({
      marker_key: z.string().nullable().catch(null),
      name: str,
      value: looseNumber,
      unit: str,
      ref_low: looseNumber.catch(null),
      ref_high: looseNumber.catch(null),
      flag: z.enum(["low", "high", "normal", "unknown"]).catch("unknown"),
    })
  ),
});
export type Extraction = z.infer<typeof ExtractionSchema>;

export const ReviewSchema = z.object({
  score: looseNumber.catch(null),
  headline: str,
  summary: str,
  systems: arr(
    z.object({
      key: z
        .enum(["metabolic", "heart", "liver", "kidney", "thyroid", "blood", "iron", "vitamins", "hormones", "inflammation", "other"])
        .catch("other"),
      status: z.enum(["good", "watch", "attention", "unknown"]).catch("unknown"),
      note: str,
    })
  ),
  priorities: arr(z.object({ title: str, detail: str })),
  eat_more: strList,
  eat_less: strList,
  hydration: str,
  see_doctor: strList,
});

export const PlanSchema = z.object({
  items: arr(
    z.object({
      name: str,
      marker_keys: strList,
      reason: str,
      frequency_months: looseNumber.transform((n) => (n && n > 0 ? Math.min(Math.round(n), 60) : 12)),
      priority: z.enum(["high", "normal", "low"]).catch("normal"),
    })
  ),
});

export const MealSchema = z.object({
  title: str,
  items: arr(z.object({ name: str, portion: str })),
  calories: looseNumber.catch(null),
  protein_g: looseNumber.catch(null),
  carbs_g: looseNumber.catch(null),
  fat_g: looseNumber.catch(null),
  fiber_g: looseNumber.catch(null),
  sugar_g: looseNumber.catch(null),
  score: looseNumber.catch(null),
  highlights: strList,
  fit_for_you: str,
});

export const MenuSchema = z.object({
  place: str,
  summary: str,
  picks: arr(z.object({ dish: str, why: str, tip: str })),
  avoid: arr(z.object({ dish: str, why: str })),
});

export const ReceiptSchema = z.object({
  store: str,
  summary: str,
  good: strList,
  swaps: arr(z.object({ from: str, to: str, why: str })),
  missing: strList,
});

export const WorkoutSchema = z.object({
  title: str,
  kind: z.enum(["strength", "cardio", "mobility", "sport", "other"]).catch("other"),
  minutes: looseNumber.catch(null),
  intensity: looseNumber.transform((n) => (n === 1 || n === 3 ? n : 2) as 1 | 2 | 3),
  kcal: looseNumber.catch(null),
  muscles: arr(z.object({ id: z.string(), role: z.enum(["primary", "secondary"]).catch("primary") })),
  exercises: strList,
  note: str,
});
