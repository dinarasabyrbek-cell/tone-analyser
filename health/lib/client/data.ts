"use client";

import { buildContext } from "../context";
import { getStore } from "../store";

export function startOfToday(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function daysAgo(n: number): string {
  return new Date(Date.now() - n * 864e5).toISOString();
}

/** Loads everything the AI needs and returns the context text. */
export async function loadContext(opts: { food?: boolean; review?: boolean } = {}) {
  const store = getStore();
  const [profile, results, food, water, review] = await Promise.all([
    store.getProfile(),
    store.listResults(),
    opts.food === false ? Promise.resolve(undefined) : store.listFood(daysAgo(7)),
    opts.food === false ? Promise.resolve(undefined) : store.listWater(daysAgo(7)),
    opts.review === false ? Promise.resolve(null) : store.latestReview(),
  ]);
  return { profile, results, context: buildContext({ profile, results, food, water, review }) };
}
