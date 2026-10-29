'use client';

import { useEffect, useReducer } from 'react';
import { Callbacks, Client } from '@colyseus/sdk';
import { ROOM_NAME, type ChatMessage, type NpcSummoned, type JoinOptions } from '@study/shared';
import { GAME_URL } from '@/lib/config';
import { REACTION_MS, initialSession, sessionReducer, type SessionAction, type StudyRoom } from './roomSession';

const SUMMON_ERROR_MS = 3500;
const BUBBLE_SWEEP_MS = 500;

/** The two synced collections we list in React. Colyseus' typings expect Schema classes, so we describe just what we use. */
interface CollectionCallbacks {
  onAdd(collection: 'players' | 'npcs', cb: () => void): unknown;
  onRemove(collection: 'players' | 'npcs', cb: () => void): unknown;
}

/**
 * Joins a study room (a specific one by id, or any open one) and exposes the
 * live Colyseus room plus the React-level bits: who's here, chat, bubbles and
 * Buddy Machine events. `getOptions` is read at join time, so a profile edited
 * in the lobby is always current.
 */
export function useStudyRoom(roomId: string | null, getOptions: () => JoinOptions) {
  const [session, dispatch] = useReducer(sessionReducer, initialSession);

  useEffect(() => {
    let cancelled = false;
    let joined: StudyRoom | null = null;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const later = (ms: number, fn: () => void) => {
      const t = setTimeout(() => {
        timers.delete(t);
        fn();
      }, ms);
      timers.add(t);
    };
    const client = new Client(GAME_URL);

    (async () => {
      try {
        const opts = getOptions();
        const r = (roomId ? await client.joinById(roomId, opts) : await client.joinOrCreate(ROOM_NAME, opts)) as StudyRoom;
        if (cancelled) {
          r.leave();
          return;
        }
        joined = r;
        listen(r);
        dispatch({ type: 'joined', room: r });
      } catch (e) {
        if (!cancelled) dispatch({ type: 'failed', error: e instanceof Error ? e.message : String(e) });
      }
    })();

    function listen(r: StudyRoom) {
      // Events from a connection we've already closed (e.g. its leave event) must not touch the next visit's state
      const send = (action: SessionAction) => {
        if (!cancelled) dispatch(action);
      };
      // State arrives just after the join resolves, so guard until the first patch lands.
      const syncPlayers = () => send({ type: 'players', ids: r.state?.players ? [...r.state.players.keys()] : [] });
      const syncNpcs = () => send({ type: 'npcs', ids: r.state?.npcs ? [...r.state.npcs.keys()] : [] });
      r.onStateChange.once(() => {
        syncPlayers();
        syncNpcs();
      });
      const callbacks = Callbacks.get(r as unknown as Parameters<typeof Callbacks.get>[0]) as unknown as CollectionCallbacks;
      callbacks.onAdd('players', syncPlayers);
      callbacks.onRemove('players', syncPlayers);
      callbacks.onAdd('npcs', syncNpcs);
      callbacks.onRemove('npcs', syncNpcs);

      r.onMessage('chat', (message: ChatMessage) => send({ type: 'chat', message, now: Date.now() }));
      r.onMessage('npc:say', (m: { npcId: string; text: string }) => send({ type: 'npcSay', ...m, now: Date.now() }));
      r.onMessage('npc:react', (m: { npcId: string; emote: string }) => {
        const key = `${m.npcId}-${Date.now()}-${Math.random()}`;
        send({ type: 'react', key, ...m });
        later(REACTION_MS, () => send({ type: 'reactionDone', key }));
      });
      r.onMessage('npc:summoned', (summon: NpcSummoned) => send({ type: 'summoned', summon, now: Date.now() }));
      r.onMessage('npc:error', (m: { message: string }) => {
        send({ type: 'summonError', message: m.message });
        later(SUMMON_ERROR_MS, () => send({ type: 'summonError', message: null }));
      });

      // Clock sync: assume the reply was stamped halfway through the round trip
      const sentAt = Date.now();
      r.onMessage('clock', (m: { serverNow: number }) => send({ type: 'clock', offset: m.serverNow - (sentAt + Date.now()) / 2 }));
      r.send('clock', {});

      r.onLeave(() => send({ type: 'closed' }));
      r.onError((_code: number, message?: string) => send({ type: 'failed', error: message ?? 'Connection error' }));
      syncPlayers();
    }

    // Drop expired speech bubbles so they disappear on time
    const sweep = setInterval(() => dispatch({ type: 'expireBubbles', now: Date.now() }), BUBBLE_SWEEP_MS);

    return () => {
      cancelled = true;
      clearInterval(sweep);
      timers.forEach(clearTimeout);
      joined?.leave();
      // Start clean next time: Next keeps this page alive (hidden) and re-runs the effect when it's shown again
      dispatch({ type: 'reset' });
    };
  }, [roomId, getOptions]);

  return session;
}
