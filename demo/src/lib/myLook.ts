'use client';

import { useSyncExternalStore } from 'react';
import type { AvatarLook } from '@study/shared';
import { ME } from './mock';

/**
 * Your character's look, changeable anywhere, inside a room too (decided 2026-11-09): saving swaps
 * it live for everyone in the room with a little sparkle, no rejoin. At most once every 5 s so nobody
 * flickers outfits. The real app sends one "change my look" message; the server checks you own the
 * items and updates the synced look.
 */
export const LOOK_COOLDOWN_MS = 5000;

const EVENT = 'connecta-demo:my-look';
let state = { look: ME.look, version: 0 };
let lastSaved = 0;

export const getMyLook = () => state.look;

/** Saves the look, or says how long to wait. */
export function saveMyLook(look: AvatarLook): { ok: true } | { ok: false; waitS: number } {
  const wait = lastSaved + LOOK_COOLDOWN_MS - Date.now();
  if (wait > 0) return { ok: false, waitS: Math.ceil(wait / 1000) };
  lastSaved = Date.now();
  state = { look, version: state.version + 1 };
  window.dispatchEvent(new Event(EVENT));
  return { ok: true };
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
}

/** The look plus a version that bumps on every save (the room uses it to swap the character). */
export const useMyLook = () =>
  useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  );
