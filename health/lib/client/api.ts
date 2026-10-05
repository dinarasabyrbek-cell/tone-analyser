"use client";

export const PASSCODE_KEY = "soul-health:passcode";

function headers(): HeadersInit {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  try {
    const p = localStorage.getItem(PASSCODE_KEY);
    if (p) h["x-app-passcode"] = p;
  } catch {}
  return h;
}

async function errorFrom(res: Response): Promise<Error> {
  const data = await res.json().catch(() => null);
  return new Error(data?.error || `Request failed (${res.status})`);
}

export async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: headers(), body: JSON.stringify(body) });
  if (!res.ok) throw await errorFrom(res);
  return res.json() as Promise<T>;
}

/** POSTs and calls onText with the growing answer as it streams in. */
export async function postStream(url: string, body: unknown, onText: (full: string) => void): Promise<string> {
  const res = await fetch(url, { method: "POST", headers: headers(), body: JSON.stringify(body) });
  if (!res.ok || !res.body) throw await errorFrom(res);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    full += decoder.decode(value, { stream: true });
    onText(full);
  }
  return full;
}

export interface AppStatus {
  ai: boolean;
  cloud: boolean;
  /** claude.ai build: where data lives */
  storage?: "account" | "browser";
  /** shown when ai is false */
  aiHint?: string;
  passcode: boolean;
  models: { fast: string; deep: string };
}

let statusPromise: Promise<AppStatus> | null = null;
export function getStatus(): Promise<AppStatus> {
  statusPromise ??= fetch("/api/status")
    .then((r) => r.json())
    .catch(() => ({ ai: false, cloud: false, passcode: false, models: { fast: "", deep: "" } }));
  return statusPromise;
}
