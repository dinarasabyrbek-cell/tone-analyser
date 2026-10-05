import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function cloudConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export async function serverSupabase() {
  const cookieStore = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(toSet) {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component — the proxy refreshes sessions, so this is safe to ignore.
        }
      },
    },
  });
}

/**
 * Guards AI routes so nobody else can spend your API credits.
 * Cloud mode: requires a signed-in Supabase user.
 * Demo mode: optional APP_PASSCODE header check (set it when the demo is deployed publicly).
 */
export async function requireUser(req: Request): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (cloudConfigured()) {
    const sb = await serverSupabase();
    const { data } = await sb.auth.getUser();
    if (!data.user) return { ok: false, status: 401, error: "Please sign in again." };
    return { ok: true };
  }
  const pass = process.env.APP_PASSCODE;
  if (pass && req.headers.get("x-app-passcode") !== pass) {
    return { ok: false, status: 401, error: "Passcode required — enter it in Profile." };
  }
  return { ok: true };
}
