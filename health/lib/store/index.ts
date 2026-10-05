"use client";

import { createLocalStore } from "./local";
import { createSupabaseStore } from "./supabase";
import { browserSupabase, isCloudConfigured } from "../supabase/client";
import type { Store } from "./types";

let store: Store | null = null;

export function getStore(): Store {
  if (!store) store = isCloudConfigured() ? createSupabaseStore(browserSupabase()) : createLocalStore();
  return store;
}

export type { Store };
