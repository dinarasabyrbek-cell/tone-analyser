// Builds the compact "about me" text that every AI call receives. Pure functions — usable on client and server.
import { BIOMARKERS, getBiomarker, SYSTEMS } from "./biomarkers";
import type { FoodEntry, HealthReview, MealResult, Profile, ResultPoint, WaterLog } from "./types";

export interface MarkerSeries {
  key: string;
  name: string;
  unit: string;
  system: string;
  points: ResultPoint[]; // oldest → newest
  latest: ResultPoint;
  previous: ResultPoint | null;
}

/** Groups results by marker, newest point last. */
export function seriesByMarker(results: ResultPoint[]): MarkerSeries[] {
  const map = new Map<string, ResultPoint[]>();
  for (const r of results) {
    const list = map.get(r.marker_key) ?? [];
    list.push(r);
    map.set(r.marker_key, list);
  }
  const out: MarkerSeries[] = [];
  for (const [key, pts] of map) {
    pts.sort((a, b) => a.taken_at.localeCompare(b.taken_at));
    const b = getBiomarker(key);
    const latest = pts[pts.length - 1];
    out.push({
      key,
      name: b?.name ?? latest.raw_name,
      unit: b?.unit ?? latest.unit,
      system: b?.system ?? "other",
      points: pts,
      latest,
      previous: pts.length > 1 ? pts[pts.length - 2] : null,
    });
  }
  const order = new Map(BIOMARKERS.map((b, i) => [b.key, i]));
  return out.sort((a, b) => (order.get(a.key) ?? 999) - (order.get(b.key) ?? 999) || a.name.localeCompare(b.name));
}

export function age(p: Profile): number | null {
  return p.birth_year ? new Date().getFullYear() - p.birth_year : null;
}

export function waterTarget(p: Profile): number {
  if (p.water_target_ml) return p.water_target_ml;
  if (p.weight_kg) return Math.round((p.weight_kg * 33) / 250) * 250;
  return 2000;
}

function fmtPoint(r: ResultPoint) {
  const ref =
    r.ref_low != null || r.ref_high != null ? ` (ref ${r.ref_low ?? ""}–${r.ref_high ?? ""})` : "";
  const flag = r.flag !== "normal" && r.flag !== "unknown" ? ` [${r.flag.toUpperCase()}]` : "";
  return `${r.value} ${r.unit}${ref}${flag} on ${r.taken_at}`;
}

export function profileText(p: Profile): string {
  const lines = [
    `Age: ${age(p) ?? "unknown"}; sex: ${p.sex || "unknown"}; height: ${p.height_cm ?? "?"} cm; weight: ${p.weight_kg ?? "?"} kg`,
  ];
  if (p.conditions) lines.push(`Known conditions: ${p.conditions}`);
  if (p.medications) lines.push(`Medications: ${p.medications}`);
  if (p.supplements) lines.push(`Supplements: ${p.supplements}`);
  if (p.diet) lines.push(`Diet: ${p.diet}`);
  if (p.goals) lines.push(`Goals: ${p.goals}`);
  return lines.join("\n");
}

export function labsText(series: MarkerSeries[], maxHistory = 4): string {
  if (!series.length) return "No lab results uploaded yet.";
  const bySystem = new Map<string, MarkerSeries[]>();
  for (const s of series) bySystem.set(s.system, [...(bySystem.get(s.system) ?? []), s]);
  const lines: string[] = [];
  for (const [sys, list] of bySystem) {
    lines.push(`## ${SYSTEMS[sys as keyof typeof SYSTEMS]?.name ?? sys}`);
    for (const s of list) {
      const hist = s.points.slice(-maxHistory).reverse();
      lines.push(
        `- ${s.name} [${s.key}]: latest ${fmtPoint(hist[0])}` +
          (hist.length > 1 ? `; earlier: ${hist.slice(1).map((h) => `${h.value} ${h.unit} (${h.taken_at})`).join(", ")}` : "")
      );
    }
  }
  return lines.join("\n");
}

export function foodText(food: FoodEntry[], water: WaterLog[], target: number): string {
  const meals = food.filter((f) => f.kind === "meal");
  const lines: string[] = [];
  if (meals.length) {
    lines.push("Meals logged in the last 7 days:");
    for (const m of meals.slice(0, 25)) {
      const r = m.result as MealResult;
      lines.push(
        `- ${m.eaten_at.slice(0, 10)}: ${r.title}${r.calories ? ` (~${r.calories} kcal, P${r.protein_g ?? "?"} C${r.carbs_g ?? "?"} F${r.fat_g ?? "?"} fibre ${r.fiber_g ?? "?"}g)` : ""}`
      );
    }
  } else lines.push("No meals logged in the last 7 days.");
  const days = new Map<string, number>();
  for (const w of water) days.set(w.logged_at.slice(0, 10), (days.get(w.logged_at.slice(0, 10)) ?? 0) + w.ml);
  if (days.size) {
    const avg = Math.round([...days.values()].reduce((a, b) => a + b, 0) / days.size);
    lines.push(`Water: average ${avg} ml/day over ${days.size} logged days (target ${target} ml).`);
  }
  return lines.join("\n");
}

export function buildContext(opts: {
  profile: Profile;
  results: ResultPoint[];
  food?: FoodEntry[];
  water?: WaterLog[];
  review?: HealthReview | null;
}): string {
  const series = seriesByMarker(opts.results);
  const parts = [
    `Today: ${new Date().toISOString().slice(0, 10)}`,
    "# Profile",
    profileText(opts.profile),
    "# Lab results (standardised names, newest first per marker)",
    labsText(series),
  ];
  if (opts.food || opts.water) {
    parts.push("# Food & water", foodText(opts.food ?? [], opts.water ?? [], waterTarget(opts.profile)));
  }
  if (opts.review) {
    parts.push(`# Last overall review (${opts.review.created_at.slice(0, 10)})`, opts.review.headline, opts.review.summary);
  }
  return parts.join("\n\n").slice(0, 40000);
}
