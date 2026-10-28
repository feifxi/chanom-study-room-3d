'use client';

import { useEffect, useState } from 'react';

/**
 * The current time, refreshed every `ms`. Components read time through this
 * instead of calling Date.now() while rendering, which keeps renders pure and
 * re-renders countdowns and synced state that React can't see change.
 */
export function useNow(ms: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

/** Whole minutes between a server timestamp and `serverNow`, e.g. for "focused 12m". */
export function minutesSince(serverMs: number, serverNow: number) {
  return serverMs ? Math.max(0, Math.floor((serverNow - serverMs) / 60_000)) : 0;
}
