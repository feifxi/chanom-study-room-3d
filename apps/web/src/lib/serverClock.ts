'use client';

import { useEffect, useState } from 'react';

/**
 * The game server's clock, as seen from here. Countdowns (focus, Watch together, Slave's turn bar,
 * Draw & Guess, invite cards) compare against the server's times, so a computer clock that's off
 * would show them off. The room asks the server's time a few times on joining (liveRoom.ts) and keeps
 * the answer that came back fastest.
 */
let offset = 0;
let bestRoundTrip = Infinity;

/** One answer: sent at `sentAt`, the server said `serverAt`, back at `backAt` (all ms) */
export function learnServerClock(sentAt: number, serverAt: number, backAt: number) {
  const roundTrip = backAt - sentAt;
  if (roundTrip < 0 || roundTrip > bestRoundTrip) return;
  bestRoundTrip = roundTrip;
  // The server answered about halfway through the trip
  offset = serverAt - (sentAt + roundTrip / 2);
}

/** A time on this computer's clock, on the server's */
export const toServerTime = (localMs: number) => localMs + offset;

/** Now, by the server's clock */
export const serverNow = () => toServerTime(Date.now());

/** Like useNow (lib/time.ts), by the server's clock: for comparing with times the server sent */
export function useServerNow(ms: number) {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    const id = setInterval(() => setNow(serverNow()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}
