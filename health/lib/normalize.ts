import { computeFlag, customKey, getBiomarker, matchBiomarker, toStandard } from "./biomarkers";
import type { Extraction } from "./schemas";
import type { NewResult } from "./store/types";

export interface DraftRow {
  marker_key: string | null;
  raw_name: string;
  value: number | null;
  unit: string;
  ref_low: number | null;
  ref_high: number | null;
}

/** Resolves the canonical key, standardised value and flag for one row. */
export function finalizeRow(row: DraftRow): NewResult | null {
  if (row.value == null || !Number.isFinite(row.value) || !row.raw_name.trim()) return null;
  const known = row.marker_key && getBiomarker(row.marker_key) ? row.marker_key : matchBiomarker(row.raw_name);
  const key = known ?? customKey(row.raw_name);
  const b = getBiomarker(key);
  const value_std = toStandard(key, row.value, row.unit);
  let flag = computeFlag(row.value, row.ref_low, row.ref_high);
  // No lab range → fall back to the dictionary's typical range (in standard units)
  if (flag === "unknown" && b?.ref && value_std != null) flag = computeFlag(value_std, b.ref[0], b.ref[1]);
  return {
    marker_key: key,
    raw_name: row.raw_name.trim(),
    value: row.value,
    unit: row.unit.trim(),
    value_std,
    ref_low: row.ref_low,
    ref_high: row.ref_high,
    flag,
  };
}

export function extractionToResults(ex: Extraction): NewResult[] {
  const out: NewResult[] = [];
  const seen = new Set<string>();
  for (const r of ex.results) {
    const row = finalizeRow({
      marker_key: r.marker_key,
      raw_name: r.name,
      value: r.value,
      unit: r.unit,
      ref_low: r.ref_low,
      ref_high: r.ref_high,
    });
    if (!row) continue;
    const dedupe = `${row.marker_key}|${row.value}|${row.unit}`;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    out.push(row);
  }
  return out;
}

/** Accepts YYYY-MM-DD, DD.MM.YYYY, DD/MM/YYYY; returns YYYY-MM-DD or "" */
export function normalizeDate(s: string): string {
  const t = s.trim();
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = t.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return "";
}

/** Value to plot for a result: standardised if possible, otherwise as reported. */
export function plotValue(r: { value: number; value_std: number | null }): number {
  return r.value_std ?? r.value;
}
