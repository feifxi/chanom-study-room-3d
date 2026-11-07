'use client';

import { useSyncExternalStore } from 'react';

/**
 * Which 3D room you're still connected to while you browse chats elsewhere (like a voice channel
 * staying connected). Module state survives client-side navigation, which is all the demo needs.
 */
export interface Connection {
  serverId: string;
  roomId: string;
  micOn: boolean;
}

let current: Connection | null = null;
const listeners = new Set<() => void>();

export function setConnection(next: Connection | null) {
  current = next;
  listeners.forEach((l) => l());
}

export function useConnection() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
    () => null,
  );
}
