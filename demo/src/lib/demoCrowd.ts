'use client';

import { useSyncExternalStore } from 'react';

/**
 * Demo-only: pretend a room is crowded (50 or 100 people) to see how the people panel copes. Only
 * the people list and its pill get the extra people; the 3D scene keeps its few avatars.
 */
export const CROWDS = [0, 50, 100] as const;
export type Crowd = (typeof CROWDS)[number];

const KEY = 'connecta-demo:crowd';
const listeners = new Set<() => void>();

function read(): Crowd {
  try {
    const n = Number(localStorage.getItem(KEY));
    return (CROWDS as readonly number[]).includes(n) ? (n as Crowd) : 0;
  } catch {
    return 0;
  }
}

export function setCrowd(n: Crowd) {
  try {
    localStorage.setItem(KEY, String(n));
  } catch {
    // Not remembered, still applied for this page
  }
  listeners.forEach((l) => l());
}

export function useCrowd(): Crowd {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    read,
    () => 0,
  );
}

const FIRST = [
  'Aom',
  'Bank',
  'Beam',
  'Bell',
  'Boss',
  'Cake',
  'Earn',
  'Fah',
  'Film',
  'Gift',
  'Ice',
  'Jane',
  'June',
  'Kao',
  'Kim',
  'Lin',
  'Mew',
  'Mild',
  'Mint',
  'Nan',
  'Net',
  'Nine',
  'Oat',
  'Palm',
  'Pang',
  'Pear',
  'Pond',
  'Prae',
  'Q',
  'Ryu',
  'Sai',
  'Tan',
  'Tee',
  'Toey',
  'Tong',
  'View',
  'Wan',
  'Yuki',
  'Zen',
  'Fern',
];
const COLORS = ['#7758c4', '#e9955a', '#2f7d55', '#b3612f', '#2e6ea8', '#c03a72', '#7a6a3a', '#df6392', '#4f9e6c', '#8a6ad8'];
const STATUSES = [
  '📖 Focusing · Calculus · 24m',
  '📖 Focusing · Physics · 8m',
  '📖 Focusing · English · 41m',
  '🪑 At a desk',
  '🛋️ On the sofa',
  '🚶 Walking around',
  '☕ On a break',
  'Hanging out',
];

/** A believable crowd of strangers, the same every time. */
export function crowdPeople(n: number) {
  return Array.from({ length: n }, (_, i) => {
    // Repeats get a surname initial, like a real crowd would ("Aom" and "Aom K.")
    const name = FIRST[i % FIRST.length]! + (i >= FIRST.length ? ` ${'KPSTNCWR'[(i * 3 + Math.floor(i / FIRST.length)) % 8]}.` : '');
    return {
      id: `crowd-${i}`,
      name,
      color: COLORS[(i * 7) % COLORS.length]!,
      status: STATUSES[(i * 5) % STATUSES.length]!,
      guest: i % 11 === 3,
      micOn: i % 4 === 0,
      deafened: i % 13 === 5,
      speaking: i === 2 || i === 17,
    };
  });
}

/** Demo-only: show Home with about 100 rooms (adds MANY_ROOMS from the mock). */
const ROOMS_KEY = 'connecta-demo:many-rooms';
const roomListeners = new Set<() => void>();

function readMany(): boolean {
  try {
    return localStorage.getItem(ROOMS_KEY) === '1';
  } catch {
    return false;
  }
}

export function setManyRooms(on: boolean) {
  try {
    localStorage.setItem(ROOMS_KEY, on ? '1' : '0');
  } catch {
    // Not remembered, still applied for this page
  }
  roomListeners.forEach((l) => l());
}

export function useManyRooms(): boolean {
  return useSyncExternalStore(
    (l) => {
      roomListeners.add(l);
      return () => roomListeners.delete(l);
    },
    readMany,
    () => false,
  );
}

/** Demo: skip the 10-minute wait and mark yourself away right now (the room listens for this). */
export const AWAY_EVENT = 'connecta-demo:away';
export function goAwayNow() {
  window.dispatchEvent(new Event(AWAY_EVENT));
}

/** Demo: the Connecta team just published an update to this room's map (feature 7's live switch). */
export const MAP_UPDATE_EVENT = 'connecta-demo:map-update';
export function publishMapUpdate() {
  window.dispatchEvent(new Event(MAP_UPDATE_EVENT));
}
