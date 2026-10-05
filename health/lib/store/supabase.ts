// Cloud store: Supabase Postgres + Storage. Row-Level Security limits every row to its owner.
import type { SupabaseClient } from "@supabase/supabase-js";
import { EMPTY_PROFILE } from "../types";
import type { ChatMessage, FoodEntry, HealthReview, LabReport, LabResult, PlanItem, Profile, WaterLog, WorkoutEntry } from "../types";
import type { NewResult, Store } from "./types";
import { uid } from "./local";

const BUCKET = "health-files";

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

export function createSupabaseStore(sb: SupabaseClient): Store {
  let userId: string | null = null;
  async function me(): Promise<string> {
    if (userId) return userId;
    const { data, error } = await sb.auth.getUser();
    if (error || !data.user) throw new Error("Not signed in");
    userId = data.user.id;
    return userId;
  }

  return {
    mode: "cloud",

    async getProfile() {
      const row = check(await sb.from("profiles").select("*").maybeSingle());
      if (!row) return { ...EMPTY_PROFILE };
      const rest = { ...(row as Record<string, unknown>) };
      delete rest.user_id;
      delete rest.updated_at;
      return { ...EMPTY_PROFILE, ...(rest as Partial<Profile>) };
    },
    async saveProfile(p) {
      check(await sb.from("profiles").upsert({ ...p, user_id: await me(), updated_at: new Date().toISOString() }));
    },

    async listReports() {
      return check(await sb.from("lab_reports").select("*").order("taken_at", { ascending: false })) as LabReport[];
    },
    async getReport(id) {
      const report = check(await sb.from("lab_reports").select("*").eq("id", id).maybeSingle()) as LabReport | null;
      if (!report) return null;
      const results = check(await sb.from("lab_results").select("*").eq("report_id", id)) as LabResult[];
      return { report, results };
    },
    async createReport(r, results) {
      const user_id = await me();
      const row = check(await sb.from("lab_reports").insert({ ...r, user_id }).select("id").single()) as { id: string };
      if (results.length) {
        check(await sb.from("lab_results").insert(results.map((x) => ({ ...x, report_id: row.id, user_id }))));
      }
      return row.id;
    },
    async updateReport(id, patch, results?: NewResult[]) {
      const rest: Partial<LabReport> = { ...patch };
      delete rest.id;
      delete rest.created_at;
      if (Object.keys(rest).length) check(await sb.from("lab_reports").update(rest).eq("id", id));
      if (results) {
        const user_id = await me();
        check(await sb.from("lab_results").delete().eq("report_id", id));
        if (results.length) {
          check(await sb.from("lab_results").insert(results.map((x) => ({ ...x, report_id: id, user_id }))));
        }
      }
    },
    async deleteReport(id) {
      const got = check(await sb.from("lab_reports").select("file_path").eq("id", id).maybeSingle()) as {
        file_path: string | null;
      } | null;
      if (got?.file_path) await sb.storage.from(BUCKET).remove([got.file_path]);
      check(await sb.from("lab_reports").delete().eq("id", id)); // results cascade
    },
    async listResults() {
      const rows = check(
        await sb.from("lab_results").select("*, lab_reports!inner(taken_at, status)").eq("lab_reports.status", "saved")
      ) as (LabResult & { lab_reports: { taken_at: string } })[];
      return rows
        .map(({ lab_reports, ...r }) => ({ ...r, taken_at: lab_reports.taken_at }))
        .sort((a, b) => a.taken_at.localeCompare(b.taken_at));
    },

    async latestReview() {
      return check(
        await sb.from("health_reviews").select("*").order("created_at", { ascending: false }).limit(1).maybeSingle()
      ) as HealthReview | null;
    },
    async saveReview(r) {
      return check(await sb.from("health_reviews").insert({ ...r, user_id: await me() }).select("*").single()) as HealthReview;
    },

    async getPlan() {
      const row = check(await sb.from("test_plans").select("items").maybeSingle()) as { items: PlanItem[] } | null;
      return row?.items ?? null;
    },
    async savePlan(items) {
      check(await sb.from("test_plans").upsert({ user_id: await me(), items, updated_at: new Date().toISOString() }));
    },

    async listFood(since) {
      let q = sb.from("food_entries").select("*").order("eaten_at", { ascending: false }).limit(200);
      if (since) q = q.gte("eaten_at", since);
      return check(await q) as FoodEntry[];
    },
    async addFood(e) {
      return check(await sb.from("food_entries").insert({ ...e, user_id: await me() }).select("*").single()) as FoodEntry;
    },
    async deleteFood(id) {
      const got = check(await sb.from("food_entries").select("photo_path").eq("id", id).maybeSingle()) as {
        photo_path: string | null;
      } | null;
      if (got?.photo_path) await sb.storage.from(BUCKET).remove([got.photo_path]);
      check(await sb.from("food_entries").delete().eq("id", id));
    },

    async listWater(since) {
      return check(await sb.from("water_logs").select("*").gte("logged_at", since).order("logged_at")) as WaterLog[];
    },
    async addWater(ml) {
      return check(await sb.from("water_logs").insert({ ml, user_id: await me() }).select("*").single()) as WaterLog;
    },
    async deleteWater(id) {
      check(await sb.from("water_logs").delete().eq("id", id));
    },

    async listWorkouts(since) {
      let q = sb.from("workouts").select("*").order("done_at", { ascending: false }).limit(300);
      if (since) q = q.gte("done_at", since);
      return check(await q) as WorkoutEntry[];
    },
    async addWorkout(w) {
      return check(await sb.from("workouts").insert({ ...w, user_id: await me() }).select("*").single()) as WorkoutEntry;
    },
    async deleteWorkout(id) {
      check(await sb.from("workouts").delete().eq("id", id));
    },

    async listMessages() {
      const rows = check(
        await sb.from("chat_messages").select("*").order("created_at", { ascending: false }).limit(100)
      ) as ChatMessage[];
      return rows.reverse();
    },
    async addMessage(m) {
      return check(await sb.from("chat_messages").insert({ ...m, user_id: await me() }).select("*").single()) as ChatMessage;
    },
    async clearMessages() {
      check(await sb.from("chat_messages").delete().eq("user_id", await me()));
    },

    async uploadFile(folder, file, name) {
      const ext = (name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `${await me()}/${folder}/${uid()}.${ext}`;
      const { error } = await sb.storage.from(BUCKET).upload(path, file, { contentType: file.type || undefined });
      if (error) throw new Error("Upload failed: " + error.message);
      return path;
    },
    async fileUrl(path) {
      const { data } = await sb.storage.from(BUCKET).createSignedUrl(path, 60 * 10);
      return data?.signedUrl ?? null;
    },
    async signOut() {
      await sb.auth.signOut();
      userId = null;
    },
  };
}
