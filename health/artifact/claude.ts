// Typed access to the claude.ai artifact runtime (window.claude.use). Absent outside a Claude viewer.
type SampleFn = ((input: string | { role: "user" | "assistant"; content: string }[], opts?: Record<string, unknown>) => Promise<{ text: string; truncated: boolean }>) & {
  limits(): Promise<{ maxPromptBytes: number; images?: { maxCount: number; maxInputBytes: number; mediaTypes: string[] } }>;
};
type DocRef = { get(): Promise<{ exists: boolean; data(): Record<string, unknown> | undefined }>; set(d: Record<string, unknown>): Promise<void>; delete(): Promise<void> };
type Snap = { docs: { id: string; data(): Record<string, unknown> | undefined }[] };
export type DB = { collection(path: string): { doc(id: string): DocRef; limit(n: number): { get(): Promise<Snap> } } };
type User = { id(): Promise<string | null> };
type Downloads = { save(f: { filename: string; data: Blob | string }): Promise<unknown> };

interface Runtime {
  use(name: "sample"): Promise<SampleFn | null>;
  use(name: "db"): Promise<DB | null>;
  use(name: "user"): Promise<User | null>;
  use(name: "downloads"): Promise<Downloads | null>;
}

const runtime = (globalThis as { claude?: Runtime }).claude;
const memo = new Map<string, Promise<unknown>>();

export function capability<T>(name: "sample" | "db" | "user" | "downloads"): Promise<T | null> {
  if (!runtime?.use) return Promise.resolve(null);
  if (!memo.has(name)) memo.set(name, (runtime.use as (n: string) => Promise<unknown>)(name).catch(() => null));
  return memo.get(name) as Promise<T | null>;
}

export type { SampleFn, Downloads, User };
