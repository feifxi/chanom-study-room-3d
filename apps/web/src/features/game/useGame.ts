'use client';

import { useEffect, useState } from 'react';
import { Client, type Room } from '@colyseus/sdk';
import { GAME_CLOSE, GAME_ROOM, type GameJoinOptions, type PlayerView } from '@connecta/shared';
import { api } from '@/lib/api/client';

/** The game server's state as the web app reads it (apps/game/src/state.ts). */
export interface GameState {
  mapId: string;
  players: Map<string, PlayerView>;
}
export type GameRoom = Room<unknown, GameState>;

/** Why you're not (or no longer) in the room. */
export type GameEnd = 'full' | 'kicked' | 'banned' | 'elsewhere' | 'gone' | 'unreachable';

export type GameSession = { status: 'connecting' } | { status: 'in'; room: GameRoom } | { status: 'out'; why: GameEnd };

const CLOSED: Record<number, GameEnd> = {
  [GAME_CLOSE.kicked]: 'kicked',
  [GAME_CLOSE.banned]: 'banned',
  [GAME_CLOSE.elsewhere]: 'elsewhere',
  [GAME_CLOSE.gone]: 'gone',
};

/**
 * Walks into a room's game server (apps/game): a one-minute ticket from the API, then the Colyseus
 * room for this Connecta room. The web app reaches it at /game on its own origin (nginx, or a Next
 * rewrite locally). Dropped connections come back by themselves (the SDK retries; the server keeps
 * your place 20 s). `attempt` walks in again (after "Walk in here").
 */
export function useGame(roomId: string, attempt = 0): GameSession {
  // Each walk-in's result is kept with its key, so a new attempt reads as connecting until it lands
  const key = `${roomId}:${attempt}`;
  const [result, setResult] = useState<{ key: string; session: GameSession } | null>(null);

  useEffect(() => {
    let cancelled = false;
    let joined: GameRoom | null = null;
    const setSession = (session: GameSession) => setResult({ key: `${roomId}:${attempt}`, session });
    // On the next tick, so a mount that's undone at once (React's development double-mount) never
    // connects: a second connection would take over from the first ("one of you per room")
    const start = setTimeout(async () => {
      try {
        const res = await api.POST('/api/rooms/{id}/ticket', { params: { path: { id: roomId } } });
        if (!res.data) {
          const code = (res.error as { code?: string } | undefined)?.code;
          if (!cancelled) setSession({ status: 'out', why: code === 'banned' ? 'banned' : 'gone' });
          return;
        }
        const client = new Client(`${window.location.origin}/game`);
        const options: GameJoinOptions = { place: res.data.place, ticket: res.data.ticket };
        const room = (await client.joinOrCreate(GAME_ROOM, options)) as GameRoom;
        if (cancelled) return void room.leave();
        joined = room;
        room.onLeave((code) => {
          if (!cancelled) setSession({ status: 'out', why: CLOSED[code] ?? 'unreachable' });
        });
        setSession({ status: 'in', room });
      } catch (e) {
        if (cancelled) return;
        setSession({ status: 'out', why: e instanceof Error && /full/.test(e.message) ? 'full' : 'unreachable' });
      }
    });
    return () => {
      cancelled = true;
      clearTimeout(start);
      void joined?.leave();
    };
  }, [roomId, attempt]);

  return result?.key === key ? result.session : { status: 'connecting' };
}
