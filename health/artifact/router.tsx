"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

// Router for the single-page claude.ai build (paths like `/labs/123?x=1`, kept in memory).
export interface Route {
  path: string;
  query: URLSearchParams;
  params: Record<string, string>;
}

// In-memory location: claude.ai pages can't carry route state in the URL, so navigation lives here.
let current = "/";
const stack: string[] = [];
const listeners = new Set<() => void>();

function parse(): { path: string; query: URLSearchParams } {
  const [path, q = ""] = current.split("?");
  return { path: path || "/", query: new URLSearchParams(q) };
}

export function navigate(to: string, replace = false) {
  const next = to.startsWith("/") ? to : "/" + to;
  if (!replace) stack.push(current);
  current = next;
  listeners.forEach((l) => l());
}

export function back() {
  current = stack.pop() ?? "/";
  listeners.forEach((l) => l());
}

const Ctx = createContext<Route>({ path: "/", query: new URLSearchParams(), params: {} });

export function RouterProvider({ render }: { render: (path: string) => { node: ReactNode; params: Record<string, string> } }) {
  const [loc, setLoc] = useState(parse);
  useEffect(() => {
    const on = () => {
      setLoc(parse());
      window.scrollTo(0, 0);
    };
    listeners.add(on);
    return () => {
      listeners.delete(on);
    };
  }, []);
  const { node, params: p } = render(loc.path);
  return <Ctx.Provider value={{ ...loc, params: p }}>{node}</Ctx.Provider>;
}

export function useRoute(): Route {
  return useContext(Ctx);
}

/** Matches `/markers/:key` style patterns. */
export function match(pattern: string, path: string): Record<string, string> | null {
  const a = pattern.split("/").filter(Boolean);
  const b = path.split("/").filter(Boolean);
  if (a.length !== b.length) return null;
  const out: Record<string, string> = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith(":")) out[a[i].slice(1)] = decodeURIComponent(b[i]);
    else if (a[i] !== b[i]) return null;
  }
  return out;
}
