import { MUSCLES } from "./anatomy";
import type { WorkoutEntry } from "./types";

const HOURS_TO_RECOVER = { strength: 72, cardio: 48, sport: 48, mobility: 24, other: 48 } as const;

/** 0 = fully recovered … 1 = just trained hard. Linear decay over the recovery window. */
export function muscleFatigue(workouts: WorkoutEntry[], now = Date.now()): Map<string, number> {
  const out = new Map<string, number>();
  for (const w of workouts) {
    const hours = (now - Date.parse(w.done_at)) / 36e5;
    const window = HOURS_TO_RECOVER[w.kind] ?? 48;
    if (hours < 0 || hours > window) continue;
    const dose = (w.intensity / 3) * Math.min(1.2, (w.minutes ?? 45) / 45);
    const left = 1 - hours / window;
    for (const m of w.muscles) {
      const add = dose * left * (m.role === "primary" ? 1 : 0.5);
      out.set(m.id, Math.min(1, (out.get(m.id) ?? 0) + add));
    }
  }
  return out;
}

export function recoveryPct(fatigue: number | undefined): number {
  return Math.round(100 - Math.min(1, fatigue ?? 0) * 100);
}

/** How many sessions hit each muscle in the last 7 days. */
export function weeklyCounts(workouts: WorkoutEntry[], now = Date.now()): Map<string, number> {
  const out = new Map<string, number>();
  for (const w of workouts) {
    if (now - Date.parse(w.done_at) > 7 * 864e5) continue;
    for (const m of w.muscles) if (m.role === "primary") out.set(m.id, (out.get(m.id) ?? 0) + 1);
  }
  return out;
}

/** Muscles not trained in the last 7 days — gentle suggestion for balance. */
export function neglected(workouts: WorkoutEntry[], now = Date.now()) {
  const counts = weeklyCounts(workouts, now);
  return MUSCLES.filter((m) => !counts.get(m.id));
}

export function workoutsText(workouts: WorkoutEntry[]): string {
  if (!workouts.length) return "No workouts logged in the last 14 days.";
  return [
    "Workouts in the last 14 days:",
    ...workouts.slice(0, 30).map(
      (w) =>
        `- ${w.done_at.slice(0, 10)}: ${w.title} (${w.kind}, ${w.minutes ?? "?"} min, ${["", "easy", "moderate", "hard"][w.intensity]}` +
        `${w.muscles.length ? `; ${w.muscles.filter((m) => m.role === "primary").map((m) => m.id.replace("m_", "")).join(", ")}` : ""})`
    ),
  ].join("\n");
}
