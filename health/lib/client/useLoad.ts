"use client";

import { useCallback, useEffect, useRef, useState, type SetStateAction } from "react";

interface State<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

/** Runs an async loader on mount, when `deps` change, and on reload(); tracks loading/error state. */
export function useLoad<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<State<T>>({ data: null, error: null, loading: true });
  const [tick, setTick] = useState(0);
  const latest = useRef(loader);
  useEffect(() => {
    latest.current = loader;
  });
  const key = JSON.stringify(deps);

  useEffect(() => {
    let alive = true;
    latest
      .current()
      .then((data) => alive && setState({ data, error: null, loading: false }))
      .catch((e: Error) => alive && setState((s) => ({ ...s, error: e.message, loading: false })));
    return () => {
      alive = false;
    };
  }, [key, tick]);

  const setData = useCallback((v: SetStateAction<T | null>) => {
    setState((s) => ({ ...s, data: typeof v === "function" ? (v as (p: T | null) => T | null)(s.data) : v }));
  }, []);

  const reload = useCallback(() => {
    setState((s) => ({ ...s, loading: true }));
    setTick((t) => t + 1);
  }, []);

  return { ...state, setData, reload };
}
