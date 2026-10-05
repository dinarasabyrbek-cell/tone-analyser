// KV backend on the artifact's private per-viewer db subtree (data/users/<id>/...), so data follows the
// viewer's Claude account across devices. Each key is one JSON string, split into ≤60k-char chunk docs.
import type { KV } from "@/lib/store/local";
import type { DB } from "./claude";

const CHUNK = 60_000;

export async function createDbKV(db: DB, uid: string): Promise<KV> {
  const col = db.collection(`data/users/${uid}`);
  const snap = await col.limit(1000).get();
  const chunks = new Map<string, string[]>();
  const totals = new Map<string, number>();
  for (const d of snap.docs) {
    const body = d.data();
    if (!body || typeof body.key !== "string" || typeof body.json !== "string") continue;
    const arr = chunks.get(body.key) ?? [];
    arr[Number(body.n) || 0] = body.json;
    chunks.set(body.key, arr);
    if (Number(body.n) === 0) totals.set(body.key, Number(body.total) || 1);
  }
  const cache = new Map<string, string>(); // key → full JSON
  const written = new Map<string, string[]>(); // key → chunks as stored
  for (const [key, arr] of chunks) {
    const total = totals.get(key) ?? arr.length;
    const parts = arr.slice(0, total);
    written.set(key, arr.slice());
    if (parts.length === total && parts.every((p) => typeof p === "string")) cache.set(key, parts.join(""));
  }

  const running = new Map<string, Promise<void>>();
  const dirty = new Set<string>();

  async function flush(key: string) {
    while (dirty.has(key)) {
      dirty.delete(key);
      const s = cache.get(key);
      const next = s === undefined ? [] : Array.from({ length: Math.max(1, Math.ceil(s.length / CHUNK)) }, (_, i) => s.slice(i * CHUNK, (i + 1) * CHUNK));
      const prev = written.get(key) ?? [];
      try {
        // write the tail first and chunk 0 (which carries `total`) last, then drop leftovers
        for (let i = next.length - 1; i >= 0; i--) {
          if (prev[i] === next[i] && (i !== 0 || prev.length === next.length)) continue;
          await col.doc(`${key}~${i}`).set({ key, n: i, total: next.length, json: next[i] });
        }
        for (let i = next.length; i < prev.length; i++) await col.doc(`${key}~${i}`).delete();
        written.set(key, next);
      } catch (e) {
        // Keep the data in memory for this visit; the next change re-sends every differing chunk.
        console.error("Saving failed", key, e);
        window.dispatchEvent(new CustomEvent("soul-save-error", { detail: (e as { message?: string })?.message ?? String(e) }));
        return;
      }
    }
  }

  function schedule(key: string) {
    dirty.add(key);
    if (running.has(key)) return;
    const p = flush(key).finally(() => running.delete(key));
    running.set(key, p);
  }

  return {
    get(key) {
      const s = cache.get(key);
      if (s === undefined) return undefined;
      try {
        return JSON.parse(s);
      } catch {
        return undefined;
      }
    },
    set(key, value) {
      const s = JSON.stringify(value);
      if (cache.get(key) === s) return;
      cache.set(key, s);
      schedule(key);
    },
    remove(key) {
      if (!cache.has(key)) return;
      cache.delete(key);
      schedule(key);
    },
  };
}
