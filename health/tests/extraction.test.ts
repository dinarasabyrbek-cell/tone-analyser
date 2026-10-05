import { describe, expect, it } from "vitest";
import { extractJson } from "@/lib/json";
import { extractionToResults, normalizeDate } from "@/lib/normalize";
import { addMonths, baselinePlan, planStatus } from "@/lib/plan";
import { ExtractionSchema, ReviewSchema } from "@/lib/schemas";
import { seriesByMarker } from "@/lib/context";
import { EMPTY_PROFILE, type ResultPoint } from "@/lib/types";

const reply = `Here you go:
\`\`\`json
{"taken_at":"12.03.2024","lab_name":"Invitro","notes":"",
 "results":[
  {"marker_key":"ferritin","name":"Ferritin","value":"12,5","unit":"нг/мл","ref_low":15,"ref_high":150,"flag":"low"},
  {"marker_key":null,"name":"Витамин D","value":22,"unit":"ng/mL","ref_low":30,"ref_high":null,"flag":"weird"},
  {"marker_key":"made_up","name":"Glucose","value":5.1,"unit":"mmol/L","ref_low":"3.9","ref_high":"6.1"},
  {"name":"Ferritin","value":"12,5","unit":"нг/мл"},
  {"name":"Broken row","value":"n/a","unit":""},
  "garbage"
 ]}
\`\`\``;

describe("AI extraction pipeline", () => {
  const parsed = ExtractionSchema.parse(extractJson(reply));
  const results = extractionToResults(parsed);

  it("tolerates junk rows and coerces numbers", () => {
    expect(parsed.results.length).toBe(5);
    expect(results.map((r) => r.marker_key)).toEqual(["ferritin", "vitamin_d", "glucose"]);
  });

  it("recomputes flags from ranges and standardises values", () => {
    const [ferritin, vitD, glucose] = results;
    expect(ferritin.value).toBe(12.5);
    expect(ferritin.value_std).toBe(12.5);
    expect(ferritin.flag).toBe("low");
    expect(vitD.flag).toBe("low");
    expect(glucose.flag).toBe("normal");
    expect(glucose.value_std).toBeCloseTo(91.9, 1);
  });

  it("normalises dates", () => {
    expect(normalizeDate(parsed.taken_at)).toBe("2024-03-12");
    expect(normalizeDate("2024-3-5")).toBe("2024-03-05");
    expect(normalizeDate("March 2024")).toBe("");
  });
});

it("review schema fills defaults for missing fields", () => {
  const r = ReviewSchema.parse({ headline: "Mostly good", systems: [{ key: "liver", status: "great?" }] });
  expect(r.systems[0]).toEqual({ key: "liver", status: "unknown", note: "" });
  expect(r.priorities).toEqual([]);
  expect(r.score).toBeNull();
});

describe("test plan", () => {
  const pt = (marker_key: string, taken_at: string, flag: ResultPoint["flag"]): ResultPoint => ({
    id: marker_key + taken_at, report_id: "r", marker_key, raw_name: marker_key, value: 1, unit: "", value_std: 1,
    ref_low: null, ref_high: null, flag, taken_at,
  });

  it("brings flagged markers forward to 3 months", () => {
    const series = seriesByMarker([pt("ferritin", "2024-01-10", "low")]);
    const plan = baselinePlan(EMPTY_PROFILE, series);
    const iron = plan.find((p) => p.marker_keys.includes("ferritin"))!;
    expect(iron.frequency_months).toBe(3);
    expect(iron.priority).toBe("high");
    expect(plan[0].priority).toBe("high");
    expect(planStatus(iron, series, "2024-02-01")).toMatchObject({ lastDone: "2024-01-10", nextDue: "2024-04-10", overdue: false });
  });

  it("addMonths clamps month ends", () => {
    expect(addMonths("2024-01-31", 1)).toBe("2024-02-29");
    expect(addMonths("2023-11-15", 3)).toBe("2024-02-15");
  });
});
