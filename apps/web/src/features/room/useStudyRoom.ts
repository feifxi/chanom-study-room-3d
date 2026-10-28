'use client';

import { useEffect, useRef, useState } from 'react';
import { Callbacks, Client, type Room } from '@colyseus/sdk';
import { ROOM_NAME, type ChatMessage, type JoinOptions, type PlayerView } from '@study/shared';
import { GAME_URL } from '@/lib/config';

export interface RoomStateView {
  players: Map<string, PlayerView>;
}

export type StudyRoom = Room<any, RoomStateView>;

export type ConnectionStatus = 'connecting' | 'connected' | 'error' | 'closed';

const BUBBLE_MS = 4500;

export interface Bubble {
  text: string;
  until: number;
}

/**
 * Joins a study room (a specific one by id, or any open one) and exposes the
 * live Colyseus room plus the React-level bits: who's here and the chat log.
 * Positions are read straight from `room.state` every frame, not via React.
 */
export function useStudyRoom(roomId: string | null, options: JoinOptions | null) {
  const [room, setRoom] = useState<StudyRoom | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [playerIds, setPlayerIds] = useState<string[]>([]);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [bubbles, setBubbles] = useState<Record<string, Bubble>>({});
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    if (!optionsRef.current) return;
    let cancelled = false;
    let joined: StudyRoom | null = null;
    const client = new Client(GAME_URL);
    setStatus('connecting');
    setError(null);

    (async () => {
      try {
        const opts = optionsRef.current!;
        const r = (roomId ? await client.joinById(roomId, opts) : await client.joinOrCreate(ROOM_NAME, opts)) as StudyRoom;
        if (cancelled) {
          r.leave();
          return;
        }
        joined = r;
        const callbacks = Callbacks.get(r as any) as any;
        // State arrives just after the join resolves, so guard until the first patch lands.
        const syncIds = () => setPlayerIds(r.state?.players ? [...r.state.players.keys()] : []);
        r.onStateChange.once(syncIds);
        callbacks.onAdd('players', syncIds);
        callbacks.onRemove('players', syncIds);
        r.onMessage('chat', (m: ChatMessage) => {
          setChat((log) => [...log.slice(-99), m]);
          setBubbles((b) => ({ ...b, [m.sessionId]: { text: m.text, until: Date.now() + BUBBLE_MS } }));
        });
        r.onLeave(() => setStatus('closed'));
        r.onError((_code: number, message?: string) => {
          setError(message ?? 'Connection error');
          setStatus('error');
        });
        syncIds();
        setRoom(r);
        setStatus('connected');
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
      joined?.leave();
      setRoom(null);
      setPlayerIds([]);
    };
    // Re-join only when the target room changes.
  }, [roomId, options !== null]);

  // Drop expired speech bubbles so they disappear on time
  useEffect(() => {
    const timer = setInterval(() => {
      setBubbles((b) => {
        const now = Date.now();
        const live = Object.entries(b).filter(([, v]) => v.until > now);
        return live.length === Object.keys(b).length ? b : Object.fromEntries(live);
      });
    }, 500);
    return () => clearInterval(timer);
  }, []);

  return { room, status, error, playerIds, chat, bubbles };
}
