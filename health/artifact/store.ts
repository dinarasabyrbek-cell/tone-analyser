// claude.ai build of lib/store: private Claude-account storage when available, else this browser.
import { createKVStore, localStorageKV } from "@/lib/store/local";
import type { Store } from "@/lib/store/types";
import { capability, type DB, type User } from "./claude";
import { createDbKV } from "./dbKV";

const ready: Promise<{ store: Store; storage: "account" | "browser" }> = (async () => {
  try {
    const [db, user] = await Promise.all([capability<DB>("db"), capability<User>("user")]);
    const id = user ? await user.id() : null;
    if (db && id) return { store: createKVStore(await createDbKV(db, id), "account"), storage: "account" as const };
  } catch (e) {
    console.warn("Account storage unavailable, using this browser", e);
  }
  return { store: createKVStore(localStorageKV, "demo"), storage: "browser" as const };
})();

export const storageMode = () => ready.then((r) => r.storage);

let proxy: Store | null = null;

/** Same interface as lib/store: every method waits for the backend to be ready. */
export function getStore(): Store {
  if (proxy) return proxy;
  proxy = new Proxy({} as Store, {
    get(_t, prop: string) {
      if (prop === "mode") return "account";
      return async (...args: unknown[]) => {
        const { store } = await ready;
        return (store[prop as keyof Store] as (...a: unknown[]) => unknown)(...args);
      };
    },
  });
  return proxy;
}

export type { Store };
