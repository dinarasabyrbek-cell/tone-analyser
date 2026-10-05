import type {
  ChatMessage,
  FoodEntry,
  HealthReview,
  LabReport,
  LabResult,
  PlanItem,
  Profile,
  ResultPoint,
  WaterLog,
  WorkoutEntry,
} from "../types";

export type NewResult = Omit<LabResult, "id" | "report_id">;

/** Everything the UI needs from persistence. Implemented by Supabase (cloud) and localStorage (demo). */
export interface Store {
  mode: "cloud" | "demo";

  getProfile(): Promise<Profile>;
  saveProfile(p: Profile): Promise<void>;

  listReports(): Promise<LabReport[]>;
  getReport(id: string): Promise<{ report: LabReport; results: LabResult[] } | null>;
  createReport(r: Omit<LabReport, "id" | "created_at">, results: NewResult[]): Promise<string>;
  updateReport(id: string, patch: Partial<LabReport>, results?: NewResult[]): Promise<void>;
  deleteReport(id: string): Promise<void>;
  /** All saved results with their report date, oldest first. */
  listResults(): Promise<ResultPoint[]>;

  latestReview(): Promise<HealthReview | null>;
  saveReview(r: Omit<HealthReview, "id" | "created_at">): Promise<HealthReview>;

  getPlan(): Promise<PlanItem[] | null>;
  savePlan(items: PlanItem[]): Promise<void>;

  listFood(sinceISO?: string): Promise<FoodEntry[]>;
  addFood(e: Omit<FoodEntry, "id">): Promise<FoodEntry>;
  deleteFood(id: string): Promise<void>;

  listWater(sinceISO: string): Promise<WaterLog[]>;
  addWater(ml: number): Promise<WaterLog>;
  deleteWater(id: string): Promise<void>;

  listWorkouts(sinceISO?: string): Promise<WorkoutEntry[]>;
  addWorkout(w: Omit<WorkoutEntry, "id">): Promise<WorkoutEntry>;
  deleteWorkout(id: string): Promise<void>;

  listMessages(): Promise<ChatMessage[]>;
  addMessage(m: Omit<ChatMessage, "id" | "created_at">): Promise<ChatMessage>;
  clearMessages(): Promise<void>;

  /** Stores an original file (lab PDF, food photo). Returns a storage path or null when not supported. */
  uploadFile(folder: "labs" | "food", file: Blob, name: string): Promise<string | null>;
  fileUrl(path: string): Promise<string | null>;

  signOut(): Promise<void>;
}
