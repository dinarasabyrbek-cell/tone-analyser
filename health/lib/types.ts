import type { Flag, SystemKey } from "./biomarkers";

export interface Profile {
  name: string;
  birth_year: number | null;
  sex: "female" | "male" | "other" | "";
  height_cm: number | null;
  weight_kg: number | null;
  conditions: string;
  medications: string;
  supplements: string;
  diet: string;
  goals: string;
  water_target_ml: number | null;
}

export const EMPTY_PROFILE: Profile = {
  name: "",
  birth_year: null,
  sex: "",
  height_cm: null,
  weight_kg: null,
  conditions: "",
  medications: "",
  supplements: "",
  diet: "",
  goals: "",
  water_target_ml: null,
};

export interface LabResult {
  id: string;
  report_id: string;
  marker_key: string;
  raw_name: string;
  value: number;
  unit: string;
  value_std: number | null;
  ref_low: number | null;
  ref_high: number | null;
  flag: Flag;
  note?: string | null;
}

export interface LabReport {
  id: string;
  taken_at: string; // YYYY-MM-DD
  lab_name: string;
  file_name: string;
  file_path: string | null;
  status: "review" | "saved";
  ai_notes: string | null;
  created_at: string;
}

/** A lab result together with the date of its report — the unit used for trends. */
export interface ResultPoint extends LabResult {
  taken_at: string;
}

export type SystemStatus = "good" | "watch" | "attention" | "unknown";

export interface HealthReview {
  id: string;
  created_at: string;
  score: number | null;
  headline: string;
  summary: string;
  systems: { key: SystemKey; status: SystemStatus; note: string }[];
  priorities: { title: string; detail: string }[];
  eat_more: string[];
  eat_less: string[];
  hydration: string;
  see_doctor: string[];
  model: string;
}

export interface PlanItem {
  id: string;
  name: string;
  marker_keys: string[];
  reason: string;
  frequency_months: number;
  priority: "high" | "normal" | "low";
  source: "baseline" | "ai";
}

export type FoodKind = "meal" | "menu" | "receipt";

export interface MealResult {
  title: string;
  items: { name: string; portion: string }[];
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
  sugar_g: number | null;
  score: number | null;
  highlights: string[];
  fit_for_you: string;
}

export interface MenuResult {
  place: string;
  summary: string;
  picks: { dish: string; why: string; tip?: string }[];
  avoid: { dish: string; why: string }[];
}

export interface ReceiptResult {
  store: string;
  summary: string;
  good: string[];
  swaps: { from: string; to: string; why: string }[];
  missing: string[];
}

export interface FoodEntry {
  id: string;
  kind: FoodKind;
  eaten_at: string; // ISO
  note: string;
  thumb: string | null; // small data URL preview
  photo_path: string | null;
  result: MealResult | MenuResult | ReceiptResult;
}

export interface WaterLog {
  id: string;
  ml: number;
  logged_at: string; // ISO
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface WorkoutMuscle {
  id: string; // muscle mesh id, see lib/anatomy.ts
  role: "primary" | "secondary";
}

export interface WorkoutEntry {
  id: string;
  done_at: string; // ISO
  text: string; // what the user typed
  title: string;
  kind: "strength" | "cardio" | "mobility" | "sport" | "other";
  minutes: number | null;
  intensity: 1 | 2 | 3; // easy / moderate / hard
  kcal: number | null;
  muscles: WorkoutMuscle[];
  exercises: string[];
  note: string;
}
