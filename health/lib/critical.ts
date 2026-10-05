// "Act today" thresholds in standard units. Conservative adult values adapted from common lab critical-value lists.
// The lab's own critical flags always win; this is a safety net, not a diagnosis.
import { getBiomarker } from "./biomarkers";
import type { ResultPoint } from "./types";

const CRITICAL: Record<string, [number | null, number | null]> = {
  glucose: [54, 400], // mg/dL
  potassium: [3.0, 6.0], // mmol/L
  sodium: [125, 155], // mmol/L
  hemoglobin: [8, 20], // g/dL
  platelets: [50, 1000], // x10^9/L
  wbc: [2, 30], // x10^9/L
  calcium: [7.5, 12], // mg/dL
  egfr: [30, null], // mL/min/1.73m2
  alt: [null, 500], // U/L
  ast: [null, 500], // U/L
  bilirubin_total: [null, 5], // mg/dL
  magnesium: [1.2, 4.5], // mg/dL
  tsh: [0.05, 20], // mIU/L
  crp: [null, 100], // mg/L
};

export interface CriticalHit {
  key: string;
  name: string;
  value: string;
  taken_at: string;
  direction: "low" | "high";
}

/** Latest results that fall in the urgent range. Only results from the last 12 months are considered. */
export function criticalHits(latest: ResultPoint[], today = new Date()): CriticalHit[] {
  const cutoff = new Date(today.getTime() - 365 * 864e5).toISOString().slice(0, 10);
  const hits: CriticalHit[] = [];
  for (const r of latest) {
    const t = CRITICAL[r.marker_key];
    if (!t || r.value_std == null || r.taken_at < cutoff) continue;
    const dir = t[0] != null && r.value_std < t[0] ? "low" : t[1] != null && r.value_std > t[1] ? "high" : null;
    if (dir) hits.push({ key: r.marker_key, name: getBiomarker(r.marker_key)?.name ?? r.raw_name, value: `${r.value} ${r.unit}`, taken_at: r.taken_at, direction: dir });
  }
  return hits;
}
