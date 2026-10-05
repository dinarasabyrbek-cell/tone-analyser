import { age, type MarkerSeries } from "./context";
import type { PlanItem, Profile } from "./types";

type Base = Omit<PlanItem, "id" | "source">;

const BASELINE: Base[] = [
  { name: "Complete blood count", marker_keys: ["hemoglobin", "wbc", "platelets", "rbc", "hematocrit", "mcv"], reason: "Screens for anaemia, infection and blood disorders.", frequency_months: 12, priority: "normal" },
  { name: "Lipid panel", marker_keys: ["total_cholesterol", "ldl", "hdl", "triglycerides"], reason: "Tracks heart and artery health.", frequency_months: 12, priority: "normal" },
  { name: "Blood sugar (glucose + HbA1c)", marker_keys: ["glucose", "hba1c"], reason: "Early detection of insulin resistance and diabetes.", frequency_months: 12, priority: "normal" },
  { name: "Liver panel", marker_keys: ["alt", "ast", "ggt", "bilirubin_total"], reason: "Checks liver stress from diet, alcohol or medication.", frequency_months: 12, priority: "normal" },
  { name: "Kidney function", marker_keys: ["creatinine", "egfr", "urea"], reason: "Makes sure kidneys filter well.", frequency_months: 12, priority: "normal" },
  { name: "Thyroid (TSH)", marker_keys: ["tsh", "ft4"], reason: "Thyroid drives energy, weight and mood.", frequency_months: 12, priority: "normal" },
  { name: "Vitamin D", marker_keys: ["vitamin_d"], reason: "Very commonly low; affects bones, immunity, mood.", frequency_months: 12, priority: "normal" },
  { name: "Iron stores (ferritin)", marker_keys: ["ferritin", "iron", "transferrin_sat"], reason: "Low iron stores cause fatigue before anaemia appears.", frequency_months: 12, priority: "normal" },
  { name: "Vitamin B12 & folate", marker_keys: ["vitamin_b12", "folate"], reason: "Energy, nerves and red blood cells.", frequency_months: 24, priority: "low" },
  { name: "Inflammation (hs-CRP)", marker_keys: ["crp"], reason: "Low-grade inflammation is linked to heart risk.", frequency_months: 24, priority: "low" },
  { name: "Lipoprotein(a)", marker_keys: ["lpa"], reason: "Genetic heart-risk factor — once in a lifetime is enough.", frequency_months: 60, priority: "low" },
];

/** Rule-based plan used before (or instead of) the AI-personalised one. */
export function baselinePlan(profile: Profile, series: MarkerSeries[]): PlanItem[] {
  const items: PlanItem[] = BASELINE.map((b, i) => ({ ...b, id: `base-${i}`, source: "baseline" }));
  const a = age(profile);
  if (a != null && a >= 40) {
    for (const it of items) {
      if (["Lipid panel", "Blood sugar (glucose + HbA1c)"].includes(it.name)) it.priority = "high";
    }
  }
  // Re-check anything currently out of range in ~3 months
  const flagged = series.filter((s) => s.latest.flag === "low" || s.latest.flag === "high");
  for (const s of flagged) {
    const existing = items.find((it) => it.marker_keys.includes(s.key));
    const why = `${s.name} was ${s.latest.flag} (${s.latest.value} ${s.latest.unit}) on ${s.latest.taken_at} — re-check after changes.`;
    if (existing) {
      existing.frequency_months = Math.min(existing.frequency_months, 3);
      existing.priority = "high";
      existing.reason = why;
    } else {
      items.push({ id: `flag-${s.key}`, name: s.name, marker_keys: [s.key], reason: why, frequency_months: 3, priority: "high", source: "baseline" });
    }
  }
  return sortPlan(items);
}

const PRI = { high: 0, normal: 1, low: 2 } as const;
export function sortPlan(items: PlanItem[]): PlanItem[] {
  return [...items].sort((a, b) => PRI[a.priority] - PRI[b.priority]);
}

export interface PlanStatus {
  lastDone: string | null;
  nextDue: string; // YYYY-MM-DD
  overdue: boolean;
  daysLeft: number;
}

export function addMonths(dateISO: string, months: number): string {
  const d = new Date(dateISO + "T00:00:00Z");
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d.toISOString().slice(0, 10);
}

export function planStatus(item: PlanItem, series: MarkerSeries[], today = new Date().toISOString().slice(0, 10)): PlanStatus {
  let lastDone: string | null = null;
  for (const s of series) {
    if (item.marker_keys.includes(s.key) && (!lastDone || s.latest.taken_at > lastDone)) lastDone = s.latest.taken_at;
  }
  const nextDue = lastDone ? addMonths(lastDone, item.frequency_months) : today;
  const daysLeft = Math.round((Date.parse(nextDue) - Date.parse(today)) / 864e5);
  return { lastDone, nextDue, overdue: daysLeft < 0 || !lastDone, daysLeft };
}

export function frequencyLabel(months: number): string {
  if (months >= 60) return "Once";
  if (months % 12 === 0) return months === 12 ? "Every year" : `Every ${months / 12} years`;
  return months === 1 ? "Monthly" : `Every ${months} months`;
}
