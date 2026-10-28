import { DEFAULT_LOOK, NAME_MAX, sanitizeLook, type AvatarLook } from '@study/shared';

/**
 * Guest profile kept in localStorage until accounts arrive (phase 2).
 * Storage can be unavailable (private mode, blocked site data), so every
 * access is guarded and the app works without it.
 */
export interface Profile {
  name: string;
  look: AvatarLook;
}

const KEY = 'chanom-study:profile';

export function loadProfile(): Profile {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (raw && typeof raw === 'object') {
      return { name: String(raw.name ?? '').slice(0, NAME_MAX), look: sanitizeLook(raw.look) };
    }
  } catch {}
  return { name: '', look: DEFAULT_LOOK };
}

export function saveProfile(profile: Profile) {
  try {
    localStorage.setItem(KEY, JSON.stringify(profile));
  } catch {}
}
