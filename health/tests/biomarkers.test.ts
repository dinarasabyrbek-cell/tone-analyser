import { describe, expect, it } from "vitest";
import { computeFlag, customKey, matchBiomarker, normalizeUnit, toStandard } from "@/lib/biomarkers";

describe("matchBiomarker", () => {
  it.each([
    ["Ferritin", "ferritin"],
    ["Ферритин", "ferritin"],
    ["25-OH Vitamin D", "vitamin_d"],
    ["Витамин D", "vitamin_d"],
    ["ТТГ (тиреотропный гормон)", "tsh"],
    ["LDL Cholesterol", "ldl"],
    ["Холестерин ЛПВП", "hdl"],
    ["HbA1c", "hba1c"],
    ["Glucose, fasting", "glucose"],
    ["АЛТ", "alt"],
    ["Lipoprotein (a)", "lpa"],
  ])("%s → %s", (raw, key) => {
    expect(matchBiomarker(raw)).toBe(key);
  });

  it("returns null for unknown markers and avoids short-alias false hits", () => {
    expect(matchBiomarker("Anti-Müllerian hormone")).toBeNull();
    expect(matchBiomarker("Kappa light chains")).toBeNull();
  });
});

describe("normalizeUnit", () => {
  it("handles micro signs, case and Cyrillic", () => {
    expect(normalizeUnit("µmol/L")).toBe("umol/l");
    expect(normalizeUnit("мкмоль/л")).toBe("umol/l");
    expect(normalizeUnit("ммоль/л")).toBe("mmol/l");
    expect(normalizeUnit("нг/мл")).toBe("ng/ml");
    expect(normalizeUnit("мкМЕ/мл")).toBe("uiu/ml");
    expect(normalizeUnit("г/л")).toBe("g/l");
  });
});

describe("toStandard", () => {
  it("converts common SI units", () => {
    expect(toStandard("glucose", 5.5, "mmol/L")).toBeCloseTo(99.09, 1);
    expect(toStandard("ldl", 3.0, "mmol/L")).toBeCloseTo(116.0, 0);
    expect(toStandard("vitamin_d", 75, "nmol/L")).toBeCloseTo(30.05, 1);
    expect(toStandard("creatinine", 88.4, "µmol/L")).toBeCloseTo(1, 2);
    expect(toStandard("hemoglobin", 135, "г/л")).toBeCloseTo(13.5, 2);
    expect(toStandard("hba1c", 48, "mmol/mol")).toBeCloseTo(6.54, 1);
    expect(toStandard("tsh", 2.1, "мкМЕ/мл")).toBe(2.1);
  });
  it("passes through the standard unit and rejects unknown units", () => {
    expect(toStandard("ferritin", 40, "ng/mL")).toBe(40);
    expect(toStandard("ferritin", 40, "furlongs")).toBeNull();
    expect(toStandard("unknown_marker", 1, "mg/dL")).toBeNull();
  });
});

describe("computeFlag", () => {
  it("compares against open and closed ranges", () => {
    expect(computeFlag(5, 1, 10)).toBe("normal");
    expect(computeFlag(0.5, 1, 10)).toBe("low");
    expect(computeFlag(11, null, 10)).toBe("high");
    expect(computeFlag(11, 10, null)).toBe("normal");
    expect(computeFlag(11, null, null)).toBe("unknown");
  });
});

it("customKey makes stable slugs", () => {
  expect(customKey("Anti-Müllerian hormone (AMH)")).toBe("x_anti_müllerian_hormone");
});
