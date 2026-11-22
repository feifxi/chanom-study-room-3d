'use client';

import { useSyncExternalStore } from 'react';

/** Mute for me (feature 6): only you stop hearing them, remembered in this browser, by account. */
const KEY = 'connecta:muted-for-me';
const listeners = new Set<() => void>();
let cache: { raw: string | null; set: ReadonlySet<string> } = { raw: null, set: new Set() };

function read(): ReadonlySet<string> {
  const raw = localStorage.getItem(KEY);
  if (raw !== cache.raw) {
    let ids: unknown = [];
    try {
      ids = JSON.parse(raw ?? '[]');
    } catch {
      // A broken value: start over
    }
    cache = { raw, set: new Set(Array.isArray(ids) ? ids.filter((x) => typeof x === 'string') : []) };
  }
  return cache.set;
}

const EMPTY: ReadonlySet<string> = new Set();

export function useMutedForMe(): ReadonlySet<string> {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    read,
    () => EMPTY,
  );
}

export function setMutedForMe(userId: string, muted: boolean) {
  const next = new Set(read());
  if (muted) next.add(userId);
  else next.delete(userId);
  localStorage.setItem(KEY, JSON.stringify([...next]));
  listeners.forEach((fn) => fn());
}
