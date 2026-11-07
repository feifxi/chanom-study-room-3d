'use client';

import { useSyncExternalStore } from 'react';

/**
 * Demo-only design variants, switched from the Demo tab so alternatives can be compared live.
 * Not part of the product: once one is picked, the others get deleted.
 */
export const VARIANTS = {
  home: [
    ['dashboard', 'Dashboard', 'Sections: friends’ rooms, public rooms, servers, your week'],
    ['live', 'Live', 'Big “jump back in” room, then scrolling rows like a streaming app'],
    ['feed', 'Feed', 'A timeline of what friends are doing, with who’s online on the side'],
  ],
  server: [
    ['classic', 'Classic', 'Banner, room cards, recent chat and event'],
    ['lobby', 'Lobby', 'Rooms as big scene previews, the server feels like a building'],
    ['chat', 'Chat first', 'A strip of rooms on top, #general right below'],
  ],
  room: [
    ['classic', 'Classic', 'Tools rail left, people and chat right, dock at the bottom'],
    ['bar', 'One bar', 'Everything in a single bottom bar; panels pop up above it'],
    ['sidebar', 'Sidebar', 'A docked sidebar with tabs; the room fills the rest'],
    ['zen', 'Zen', 'Panels hide while you’re still and come back when you move the mouse'],
  ],
} as const;

export type VariantKind = keyof typeof VARIANTS;
export type Variant<K extends VariantKind> = (typeof VARIANTS)[K][number][0];

const KEY = 'connecta-demo:variants';
const listeners = new Set<() => void>();
let cache: Record<string, string> | null = null;

function read(): Record<string, string> {
  if (cache) return cache;
  try {
    cache = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, string>;
  } catch {
    cache = {};
  }
  return cache;
}

export function setVariant<K extends VariantKind>(kind: K, value: Variant<K>) {
  cache = { ...read(), [kind]: value };
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // Not remembered, still applied
  }
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** The chosen variant; the server render (and first paint) always uses the first one. */
export function useVariant<K extends VariantKind>(kind: K): Variant<K> {
  const first = VARIANTS[kind][0][0] as Variant<K>;
  return useSyncExternalStore(
    subscribe,
    () => {
      const v = read()[kind];
      return (VARIANTS[kind].some((o) => o[0] === v) ? v : first) as Variant<K>;
    },
    () => first,
  );
}
