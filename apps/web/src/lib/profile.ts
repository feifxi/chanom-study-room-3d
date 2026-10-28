import { DEFAULT_LOOK, NAME_MAX, sanitizeLook, type AvatarLook } from '@study/shared';

/**
 * Anonymous profile kept in localStorage: a nickname, a look and a random
 * visitor id that groups study stats across visits. Storage can be
 * unavailable (private mode, blocked site data), so every access is guarded
 * and the app works without it.
 */
export interface Profile {
  visitorId: string;
  name: string;
  look: AvatarLook;
}

const KEY = 'chanom-study:profile';

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `v-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function loadProfile(): Profile {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (raw && typeof raw === 'object') {
      const profile: Profile = {
        visitorId: typeof raw.visitorId === 'string' && raw.visitorId ? raw.visitorId : newId(),
        name: String(raw.name ?? '').slice(0, NAME_MAX),
        look: sanitizeLook(raw.look),
      };
      if (profile.visitorId !== raw.visitorId) saveProfile(profile);
      return profile;
    }
  } catch {}
  const fresh: Profile = { visitorId: newId(), name: '', look: DEFAULT_LOOK };
  saveProfile(fresh);
  return fresh;
}

export function saveProfile(profile: Profile) {
  try {
    localStorage.setItem(KEY, JSON.stringify(profile));
  } catch {}
}
