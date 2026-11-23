'use client';

import { useSyncExternalStore } from 'react';

/**
 * Demo: the Shop items you own (spec 15). The real app keeps them on the server, which checks a
 * look only uses what you own. Kept for this tab, like the demo's coins.
 */
const KEY = 'connecta:wardrobe';
const EVENT = 'connecta:wardrobe';
const NONE: string[] = [];
let cached: { raw: string | null; ids: string[] } | null = null;

function read(): string[] {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(KEY);
  } catch {
    // Blocked storage: nothing owned
  }
  if (cached && cached.raw === raw) return cached.ids;
  cached = { raw, ids: raw ? (JSON.parse(raw) as string[]) : NONE };
  return cached.ids;
}

export function addOwned(id: string) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify([...new Set([...read(), id])]));
  } catch {
    // Ignore: it just isn't kept
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
}

export const useOwned = () => useSyncExternalStore(subscribe, read, () => NONE);
