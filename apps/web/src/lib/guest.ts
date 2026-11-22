import type { AvatarLook } from '@connecta/shared';

/**
 * A guest's name and character, also kept for this browser tab: the room page still reads it from
 * here until rooms are on the API (the server keeps the real copy on the guest's session, and that
 * one carries over on sign-up).
 */
export type GuestProfile = { name: string; look: AvatarLook };

/** What a guest starts with before picking (also the look when there's no saved guest). */
export const GUEST_LOOK: AvatarLook = { hair: '#c8e3ff', outfit: '#12a37f', accessory: 'headphones' };

const GUEST_KEY = 'connecta-demo:guest';

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
