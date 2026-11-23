'use client';

import { useSyncExternalStore } from 'react';

/**
 * "Click to walk": on by default on every device (new players may not know WASD; phones need it).
 * People who'd rather use only keys or the joystick turn it off. A device preference, so it lives in
 * this browser rather than the account.
 */
const KEY = 'connecta:click-to-walk';
const EVENT = 'connecta:controls';

export function clickToWalkOn(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setClickToWalk(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    // Blocked storage: the choice just isn't remembered
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
}

export function useClickToWalk() {
  return [useSyncExternalStore(subscribe, clickToWalkOn, () => true), setClickToWalk] as const;
}

/** Keyboard and mouse help, shown in How to play and Settings → Controls. */
export const KEYS: [string, string][] = [
  ['WASD / arrows', 'Walk (Shift to run)'],
  ['Click the floor', 'Walk there'],
  ['E', 'Sit or stand, pet a cat, use the Buddy Machine'],
  ['Enter', 'Chat'],
  ['Esc', 'Close a panel'],
  ['Drag / scroll', 'Turn the camera / zoom'],
];
