"use client";

import { useState, useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * A string remembered in localStorage (per browser). Renders "" on the server
 * and during hydration, then the stored value; `set` updates both.
 */
export function useStoredValue(key: string): [string, (v: string) => void, (v: string) => void] {
  const stored = useSyncExternalStore(
    noopSubscribe,
    () => {
      try {
        return localStorage.getItem(key) || "";
      } catch {
        return "";
      }
    },
    () => ""
  );
  const [override, setOverride] = useState<string | null>(null);
  const remember = (v: string) => {
    try {
      localStorage.setItem(key, v);
    } catch {}
  };
  return [override ?? stored, setOverride, remember];
}
