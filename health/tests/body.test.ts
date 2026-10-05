import { describe, expect, it } from "vitest";
import { guessMinutes, guessMuscles, ORGANS, MUSCLES } from "@/lib/anatomy";
import { organStatuses } from "@/lib/bodyStatus";
import { recentChanges } from "@/lib/changes";
import { seriesByMarker } from "@/lib/context";
import { criticalHits } from "@/lib/critical";
import { getBiomarker } from "@/lib/biomarkers";
import { muscleFatigue, recoveryPct } from "@/lib/training";
import type { ResultPoint, WorkoutEntry } from "@/lib/types";

const pt = (marker_key: string, taken_at: string, value: number, flag: ResultPoint["flag"], lo: number | null = null, hi: number | null = null, value_std: number | null = value): ResultPoint => ({
  id: marker_key + taken_at, report_id: "r", marker_key, raw_name: marker_key, value, unit: "", value_std, ref_low: lo, ref_high: hi, flag, taken_at,
});

it("every organ/muscle marker key exists in the dictionary", () => {
  for (const o of ORGANS) for (const k of o.markers) expect(getBiomarker(k), `${o.id}:${k}`).toBeDefined();
  expect(new Set(MUSCLES.map((m) => m.id)).size).toBe(MUSCLES.length);
});

describe("workout parsing fallback", () => {
  it("maps casual text to muscles", () => {
    expect(guessMuscles("arms 40 min")).toEqual(expect.arrayContaining(["m_biceps", "m_triceps"]));
    expect(guessMuscles("ran 5k")).toContain("m_calves");
    expect(guessMuscles("тренировка ног")).toContain("m_quads");
    expect(guessMuscles("meditation")).toEqual([]);
  });
  it("reads durations", () => {
    expect(guessMinutes("arms 40 min")).toBe(40);
    expect(guessMinutes("walk 1.5 hours")).toBe(90);
    expect(guessMinutes("yoga")).toBeNull();
  });
});

describe("muscle recovery", () => {
  const now = Date.parse("2026-10-05T12:00:00Z");
  const w = (hoursAgo: number, intensity: 1 | 2 | 3): WorkoutEntry => ({
    id: "w" + hoursAgo, done_at: new Date(now - hoursAgo * 36e5).toISOString(), text: "", title: "", kind: "strength", minutes: 45, intensity,
    kcal: null, muscles: [{ id: "m_biceps", role: "primary" }, { id: "m_forearm", role: "secondary" }], exercises: [], note: "",
  });
  it("is tired right after a hard session and recovers over 72h", () => {
    expect(recoveryPct(muscleFatigue([w(0, 3)], now).get("m_biceps"))).toBe(0);
    expect(recoveryPct(muscleFatigue([w(0, 3)], now).get("m_forearm"))).toBe(50);
    expect(recoveryPct(muscleFatigue([w(36, 3)], now).get("m_biceps"))).toBe(50);
    expect(recoveryPct(muscleFatigue([w(80, 3)], now).get("m_biceps"))).toBe(100);
  });
});

describe("critical values", () => {
  it("flags urgent results from the last year only", () => {
    const hits = criticalHits([pt("potassium", "2026-09-01", 6.8, "high"), pt("glucose", "2026-09-01", 90, "normal"), pt("hemoglobin", "2024-01-01", 6, "low")], new Date("2026-10-05"));
    expect(hits.map((h) => h.key)).toEqual(["potassium"]);
    expect(hits[0].direction).toBe("high");
  });
});

describe("changes & organ status", () => {
  const series = seriesByMarker([
    pt("ferritin", "2025-02-14", 11, "low", 15, 150), pt("ferritin", "2025-09-20", 24, "normal", 15, 150),
    pt("ldl", "2025-02-14", 110, "normal", null, 116), pt("ldl", "2025-09-20", 139, "high", null, 116),
    pt("tsh", "2025-02-14", 2.0, "normal", 0.4, 4), pt("tsh", "2025-09-20", 2.05, "normal", 0.4, 4),
  ]);
  it("lists new flags first, then resolved, ignores stable", () => {
    const ch = recentChanges(series);
    expect(ch.map((c) => [c.key, c.kind])).toEqual([["ldl", "new_flag"], ["ferritin", "resolved"]]);
  });
  it("colours organs from their markers and lets the AI review raise the level", () => {
    const st = organStatuses(series, null);
    expect(st.get("heart")!.status).toBe("attention"); // LDL ~20% above range
    expect(st.get("thyroid")!.status).toBe("good");
    expect(st.get("adrenals")!.status).toBe("unknown");
    const withReview = organStatuses(series, { systems: [{ key: "thyroid", status: "watch", note: "TSH creeping up" }] } as never);
    expect(withReview.get("thyroid")!.status).toBe("watch");
    expect(withReview.get("thyroid")!.notes).toEqual(["TSH creeping up"]);
  });
});
