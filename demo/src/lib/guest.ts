import type { AvatarLook } from '@study/shared';
import { USERS } from './mock';

/**
 * A guest's name and character, kept for this browser tab so signing up later starts from the same
 * character (the real app keeps it on the guest session the server issues).
 */
export type GuestProfile = { name: string; look: AvatarLook };

/** What a guest starts with before picking (also the look when there's no saved guest). */
export const GUEST_LOOK: AvatarLook = { hair: '#c8e3ff', outfit: '#12a37f', accessory: 'headphones' };

const GUEST_KEY = 'connecta-demo:guest';
const AGE_LOCK_KEY = 'connecta-demo:age-lock';

export function loadGuest(): GuestProfile | null {
  try {
    const raw = sessionStorage.getItem(GUEST_KEY);
    return raw ? (JSON.parse(raw) as GuestProfile) : null;
  } catch {
    return null;
  }
}

export function saveGuest(profile: GuestProfile) {
  try {
    sessionStorage.setItem(GUEST_KEY, JSON.stringify(profile));
  } catch {
    // Private mode: the guest just picks again when signing up
  }
}

export function clearGuest() {
  try {
    sessionStorage.removeItem(GUEST_KEY);
  } catch {}
}

export const MIN_AGE = 13;
/** After an under-13 birthday, this device waits a day before trying again (so it isn't just "pick another year"). */
const AGE_LOCK_MS = 24 * 3600 * 1000;

export function ageLocked(now: number): boolean {
  try {
    return Number(localStorage.getItem(AGE_LOCK_KEY) ?? 0) > now;
  } catch {
    return false;
  }
}

export function lockAge(now: number) {
  try {
    localStorage.setItem(AGE_LOCK_KEY, String(now + AGE_LOCK_MS));
  } catch {}
}

export function clearAgeLock() {
  try {
    localStorage.removeItem(AGE_LOCK_KEY);
  } catch {}
}

/** Handles: 3–20 of a–z, 0–9, "." and "_", not starting or ending with "." */
export const HANDLE_RULE = /^[a-z0-9_](?:[a-z0-9._]{1,18}[a-z0-9_])$/;

const RESERVED = new Set(['admin', 'connecta', 'support', 'mod', 'staff', 'help', 'guest']);
// The demo's own user (ME) is the person signing up, so their handle stays free
const TAKEN = new Set([...Object.values(USERS).map((u) => u.handle), ...RESERVED]);

/** A handle guess from a display name: "Mochi Bun!" → "mochibun". */
export function handleFrom(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9._]/g, '')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 20);
}

export type HandleCheck = { ok: true } | { ok: false; reason: string; suggestions: string[] };

/** The live check under the @handle field (the real app asks the server as you type). */
export function checkHandle(handle: string): HandleCheck {
  if (handle.length < 3) return { ok: false, reason: 'At least 3 characters', suggestions: [] };
  if (!HANDLE_RULE.test(handle)) return { ok: false, reason: 'Use a–z, 0–9, "." or "_" (no dot at the start or end)', suggestions: [] };
  if (!TAKEN.has(handle)) return { ok: true };
  const base = handle.slice(0, 16);
  const suggestions = [`${base}_`, `${base}.${new Date().getFullYear() % 100}`, `its.${base}`, `${base}123`]
    .filter((s) => HANDLE_RULE.test(s) && !TAKEN.has(s))
    .slice(0, 3);
  return { ok: false, reason: RESERVED.has(handle) ? `@${handle} is reserved` : `@${handle} is taken`, suggestions };
}
