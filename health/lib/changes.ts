// "What changed since last time": new flags, back-in-range, big moves between the last two tests.
import type { MarkerSeries } from "./context";
import { plotValue } from "./normalize";

export interface Change {
  key: string;
  name: string;
  kind: "new_flag" | "resolved" | "rising" | "falling";
  from: string;
  to: string;
  pct: number;
  date: string;
}

const isOut = (f: string) => f === "high" || f === "low";

export function recentChanges(series: MarkerSeries[], threshold = 15): Change[] {
  const out: Change[] = [];
  for (const s of series) {
    if (!s.previous) continue;
    const a = plotValue(s.previous), b = plotValue(s.latest);
    const pct = a ? ((b - a) / Math.abs(a)) * 100 : 0;
    const base = {
      key: s.key,
      name: s.name,
      from: `${s.previous.value} ${s.previous.unit}`,
      to: `${s.latest.value} ${s.latest.unit}`,
      pct: Math.round(pct),
      date: s.latest.taken_at,
    };
    if (!isOut(s.previous.flag) && isOut(s.latest.flag)) out.push({ ...base, kind: "new_flag" });
    else if (isOut(s.previous.flag) && s.latest.flag === "normal") out.push({ ...base, kind: "resolved" });
    else if (Math.abs(pct) >= threshold) out.push({ ...base, kind: pct > 0 ? "rising" : "falling" });
  }
  const order = { new_flag: 0, resolved: 1, rising: 2, falling: 2 };
  return out.sort((x, y) => order[x.kind] - order[y.kind] || Math.abs(y.pct) - Math.abs(x.pct));
}
