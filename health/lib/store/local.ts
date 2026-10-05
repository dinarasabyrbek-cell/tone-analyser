// Demo store: keeps everything in this browser's localStorage. Used when Supabase isn't configured.
import { EMPTY_PROFILE } from "../types";
import type { ChatMessage, FoodEntry, HealthReview, LabReport, LabResult, PlanItem, Profile, WaterLog } from "../types";
import type { NewResult, Store } from "./types";

const PREFIX = "soul-health:";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch (e) {
    throw new Error("Browser storage is full or blocked: " + (e as Error).message);
  }
}

export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

const now = () => new Date().toISOString();

export function createLocalStore(): Store {
  return {
    mode: "demo",

    async getProfile() {
      return { ...EMPTY_PROFILE, ...read<Partial<Profile>>("profile", {}) };
    },
    async saveProfile(p) {
      write("profile", p);
    },

    async listReports() {
      return read<LabReport[]>("reports", []).sort((a, b) => b.taken_at.localeCompare(a.taken_at));
    },
    async getReport(id) {
      const report = read<LabReport[]>("reports", []).find((r) => r.id === id);
      if (!report) return null;
      return { report, results: read<LabResult[]>("results", []).filter((r) => r.report_id === id) };
    },
    async createReport(r, results) {
      const id = uid();
      write("reports", [...read<LabReport[]>("reports", []), { ...r, id, created_at: now() }]);
      write("results", [...read<LabResult[]>("results", []), ...results.map((x) => ({ ...x, id: uid(), report_id: id }))]);
      return id;
    },
    async updateReport(id, patch, results?: NewResult[]) {
      write(
        "reports",
        read<LabReport[]>("reports", []).map((r) => (r.id === id ? { ...r, ...patch, id } : r))
      );
      if (results) {
        const others = read<LabResult[]>("results", []).filter((r) => r.report_id !== id);
        write("results", [...others, ...results.map((x) => ({ ...x, id: uid(), report_id: id }))]);
      }
    },
    async deleteReport(id) {
      write("reports", read<LabReport[]>("reports", []).filter((r) => r.id !== id));
      write("results", read<LabResult[]>("results", []).filter((r) => r.report_id !== id));
    },
    async listResults() {
      const reports = new Map(read<LabReport[]>("reports", []).filter((r) => r.status === "saved").map((r) => [r.id, r]));
      return read<LabResult[]>("results", [])
        .filter((r) => reports.has(r.report_id))
        .map((r) => ({ ...r, taken_at: reports.get(r.report_id)!.taken_at }))
        .sort((a, b) => a.taken_at.localeCompare(b.taken_at));
    },

    async latestReview() {
      const all = read<HealthReview[]>("reviews", []);
      return all.length ? all[all.length - 1] : null;
    },
    async saveReview(r) {
      const review: HealthReview = { ...r, id: uid(), created_at: now() };
      write("reviews", [...read<HealthReview[]>("reviews", []).slice(-9), review]);
      return review;
    },

    async getPlan() {
      return read<PlanItem[] | null>("plan", null);
    },
    async savePlan(items) {
      write("plan", items);
    },

    async listFood(since) {
      return read<FoodEntry[]>("food", [])
        .filter((f) => !since || f.eaten_at >= since)
        .sort((a, b) => b.eaten_at.localeCompare(a.eaten_at));
    },
    async addFood(e) {
      const entry = { ...e, id: uid() };
      write("food", [...read<FoodEntry[]>("food", []), entry]);
      return entry;
    },
    async deleteFood(id) {
      write("food", read<FoodEntry[]>("food", []).filter((f) => f.id !== id));
    },

    async listWater(since) {
      return read<WaterLog[]>("water", []).filter((w) => w.logged_at >= since);
    },
    async addWater(ml) {
      const log = { id: uid(), ml, logged_at: now() };
      // keep ~60 days of water logs
      const cutoff = new Date(Date.now() - 60 * 864e5).toISOString();
      write("water", [...read<WaterLog[]>("water", []).filter((w) => w.logged_at >= cutoff), log]);
      return log;
    },
    async deleteWater(id) {
      write("water", read<WaterLog[]>("water", []).filter((w) => w.id !== id));
    },

    async listMessages() {
      return read<ChatMessage[]>("chat", []);
    },
    async addMessage(m) {
      const msg = { ...m, id: uid(), created_at: now() };
      write("chat", [...read<ChatMessage[]>("chat", []).slice(-99), msg]);
      return msg;
    },
    async clearMessages() {
      write("chat", []);
    },

    async uploadFile() {
      return null; // originals aren't kept in demo mode
    },
    async fileUrl() {
      return null;
    },
    async signOut() {},
  };
}
