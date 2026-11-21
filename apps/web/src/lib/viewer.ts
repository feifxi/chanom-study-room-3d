'use client';

import { useSyncExternalStore } from 'react';
import type { Server } from './mock';

/**
 * Demo only: who you're looking at the app as ("View as" in the Demo tab), so every role's buttons,
 * menus and settings can be seen without editing the mock data.
 *
 * - `auto`: each room's own mock role (you own Chanom Friends, mod Manga Club, and so on)
 * - `guest`: no account; you only ever see the room a guest link let you into
 * - `member` / `mod` / `owner`: that role in whichever room you open
 * - `admin`: a Connecta team account: the admin site, and team powers in Common rooms
 *
 * The real app gets all of this from the session and the room's member list.
 */
export type Viewer = 'auto' | 'guest' | 'member' | 'mod' | 'owner' | 'admin';

export const VIEWERS: { id: Viewer; label: string; emoji: string; hint: string }[] = [
  { id: 'auto', label: 'As in the mock', emoji: '🎭', hint: 'Owner of Chanom Friends, mod of Manga Club, member elsewhere' },
  { id: 'guest', label: 'Guest', emoji: '👋', hint: 'No account: one room by guest link, listen and type' },
  { id: 'member', label: 'Member', emoji: '🙂', hint: 'A member in every room' },
  { id: 'mod', label: 'Mod', emoji: '🛡️', hint: 'A mod in every room' },
  { id: 'owner', label: 'Owner', emoji: '👑', hint: 'The owner of every room' },
  { id: 'admin', label: 'Connecta team', emoji: '🧰', hint: 'Admin site, team powers in Common rooms' },
];

const KEY = 'connecta-demo:viewer';
const EVENT = 'connecta-demo:viewer';

// Starts as 'auto' on the server and the first client render (no hydration mismatch); Providers loads the saved one after mount
let current: Viewer = 'auto';

export const viewer = () => current;

export function loadViewer() {
  try {
    const saved = localStorage.getItem(KEY) as Viewer | null;
    if (saved && saved !== current && VIEWERS.some((v) => v.id === saved)) {
      current = saved;
      window.dispatchEvent(new Event(EVENT));
    }
  } catch {
    // Blocked storage: stays 'auto'
  }
}

export function setViewer(v: Viewer) {
  current = v;
  try {
    localStorage.setItem(KEY, v);
  } catch {
    // Not remembered, still applied
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
}

export const useViewer = () => useSyncExternalStore(subscribe, viewer, () => 'auto' as Viewer);

export const isGuestViewer = () => current === 'guest';
export const isTeam = () => current === 'admin';

/** Common rooms are Connecta's own: nobody is owner or mod there (the team moderates). */
export const isCommon = (server: Pick<Server, 'id'>) => server.id === 'public';

/** Your role in a room, after "View as". No role means a member (or a guest, see `isGuestViewer`). */
export function roleIn(server: Server): 'Owner' | 'Mod' | undefined {
  if (isCommon(server)) return undefined;
  switch (current) {
    case 'owner':
      return 'Owner';
    case 'mod':
      return 'Mod';
    case 'member':
    case 'guest':
      return undefined;
    default:
      return server.roles.me;
  }
}
