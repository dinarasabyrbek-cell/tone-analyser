import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function isCloudConfigured(): boolean {
  return Boolean(URL && KEY);
}

let client: SupabaseClient | null = null;

export function browserSupabase(): SupabaseClient {
  if (!URL || !KEY) throw new Error("Supabase is not configured");
  if (!client) client = createBrowserClient(URL, KEY);
  return client;
}
