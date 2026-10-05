// Turns lab results + the last AI review into a status per organ, for colouring the 3D body.
import { ORGANS, type OrganInfo } from "./anatomy";
import type { MarkerSeries } from "./context";
import type { HealthReview, SystemStatus } from "./types";

export const STATUS_COLORS: Record<SystemStatus, string> = {
  good: "#889063", // moss
  watch: "#d4a64a", // warm ochre
  attention: "#b5643c", // terracotta
  unknown: "#d9c9ad", // neutral bone
};

const RANK: Record<SystemStatus, number> = { unknown: 0, good: 1, watch: 2, attention: 3 };
const worst = (a: SystemStatus, b: SystemStatus) => (RANK[b] > RANK[a] ? b : a);

/** How far outside the lab range a value is, as a fraction of the range (0 = inside). */
function deviation(s: MarkerSeries): number {
  const { value, ref_low, ref_high } = s.latest;
  if (ref_high != null && value > ref_high) return (value - ref_high) / Math.max(Math.abs(ref_high), 1e-9);
  if (ref_low != null && value < ref_low) return (ref_low - value) / Math.max(Math.abs(ref_low), 1e-9);
  return 0;
}

export interface OrganStatus {
  organ: OrganInfo;
  status: SystemStatus;
  markers: MarkerSeries[];
  flagged: MarkerSeries[];
  notes: string[];
}

export function organStatuses(series: MarkerSeries[], review: HealthReview | null): Map<string, OrganStatus> {
  const byKey = new Map(series.map((s) => [s.key, s]));
  const out = new Map<string, OrganStatus>();
  for (const organ of ORGANS) {
    const markers = organ.markers.map((k) => byKey.get(k)).filter((s): s is MarkerSeries => !!s);
    const flagged = markers.filter((s) => s.latest.flag === "high" || s.latest.flag === "low");
    let status: SystemStatus = markers.length ? "good" : "unknown";
    for (const f of flagged) status = worst(status, deviation(f) > 0.1 ? "attention" : "watch");
    const notes: string[] = [];
    for (const sys of review?.systems ?? []) {
      if (!organ.systems.includes(sys.key)) continue;
      if (sys.note) notes.push(sys.note);
      // the AI review can raise (never lower) the lab-based status
      if (sys.status !== "unknown" && markers.length) status = worst(status, sys.status);
    }
    out.set(organ.id, { organ, status, markers, flagged, notes });
  }
  return out;
}
