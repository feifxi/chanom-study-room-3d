'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useMe } from '@/features/account/useMe';
import { liveSocket } from '@/features/chat/live';
import { FRIENDS_KEY, type Friend } from '@/features/friends/useFriends';
import { ROOMS_KEY } from '@/features/rooms/useRooms';
import type { Schemas } from '@/lib/api/client';

export type Presence = Schemas['Presence'];

/** The tab says it's still there this often (the gateway forgets a tab silent for 2.5 minutes). */
const REPORT_MS = 60_000;

// This tab's state: the room open in 3D (for toasts), and the last input (Away is 10 minutes without
// any, in every tab)
let roomId: string | null = null;
let lastInput = Date.now();

/** This tab has a room open in 3D (inbox items and DMs arrive as toasts there). */
export const inRoomNow = () => roomId !== null;

/**
 * While you're inside a room in 3D, this tab shows inbox items and DMs as toasts. Which room you're
 * in, for friends and "inside now", comes from the game server, not from the tab.
 */
export function useInRoom(id: string | null) {
  useEffect(() => {
    roomId = id;
    return () => {
      if (roomId === id) roomId = null;
    };
  }, [id]);
}

/**
 * Mounted once for the whole app: opens the live connection for anyone signed in, says what this
 * tab is doing (every minute, and at once when it changes), and keeps friends' presence and rooms'
 * "inside now" live.
 */
export function PresenceReporter() {
  const { data: me } = useMe();
  const client = useQueryClient();
  const on = !!me && (me.isGuest || me.signedUp);

  useEffect(() => {
    if (!on) return;
    const socket = liveSocket();
    const send = () => {
      // How active you are; the room comes from the game server's own connection
      if (socket.connected) socket.emit('presence', { roomId: null, idleMs: Date.now() - lastInput });
    };
    // Back after a quiet minute or more: tell friends now, not at the next minute
    const onInput = () => {
      const quiet = Date.now() - lastInput > REPORT_MS;
      lastInput = Date.now();
      if (quiet) send();
    };
    const inputs = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'] as const;
    for (const e of inputs) window.addEventListener(e, onInput, { passive: true });
    const timer = window.setInterval(send, REPORT_MS);

    const onPresence = ({ userId, presence }: { userId: string; presence: Presence }) => {
      const list = client.getQueryData<Friend[]>([...FRIENDS_KEY, 'list']);
      if (list && !list.some((f) => f.person.id === userId)) void client.invalidateQueries({ queryKey: FRIENDS_KEY });
      client.setQueryData<Friend[]>([...FRIENDS_KEY, 'list'], (all) => all?.map((f) => (f.person.id === userId ? { ...f, presence } : f)));
    };
    // Who's inside changed: the room cards and pages read it with the room
    const onInside = () => void client.invalidateQueries({ queryKey: ROOMS_KEY });
    let connectedBefore = socket.connected;
    const onConnect = () => {
      send();
      // Back after a drop: catch up on what we missed
      if (connectedBefore) void client.invalidateQueries({ queryKey: [...FRIENDS_KEY, 'list'] });
      connectedBefore = true;
    };
    if (socket.connected) send();
    socket.on('connect', onConnect);
    socket.on('presence', onPresence);
    socket.on('inside', onInside);
    return () => {
      for (const e of inputs) window.removeEventListener(e, onInput);
      window.clearInterval(timer);
      socket.off('connect', onConnect);
      socket.off('presence', onPresence);
      socket.off('inside', onInside);
    };
  }, [on, client]);

  return null;
}

/** Live "inside now" for these rooms (yours only; the gateway ignores the rest). */
export function useWatchInside(roomIds: string[]) {
  const ids = roomIds.join(',');
  useEffect(() => {
    if (!ids) return;
    const socket = liveSocket();
    const watch = () => void socket.emitWithAck('watch:inside', ids.split(','));
    if (socket.connected) watch();
    socket.on('connect', watch);
    return () => {
      socket.off('connect', watch);
    };
  }, [ids]);
}

/** "3h ago", "yesterday"… for "Last seen". */
export function lastSeen(iso: string | null): string {
  if (!iso) return 'a while ago';
  const minutes = Math.floor((Date.now() - Date.parse(iso)) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'yesterday' : `${days} days ago`;
}
