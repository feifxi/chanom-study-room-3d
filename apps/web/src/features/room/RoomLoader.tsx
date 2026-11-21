'use client';

import dynamic from 'next/dynamic';

/** WebGL, audio and localStorage: the room only ever renders in the browser. */
export const RoomLoader = dynamic(() => import('./RoomView'), {
  ssr: false,
  loading: () => (
    <div className="grid h-dvh place-items-center">
      <p className="animate-pulse font-black text-muted-foreground">Walking in… 🚪</p>
    </div>
  ),
});
