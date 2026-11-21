'use client';

import { useEffect, useState } from 'react';
import { Scene } from '@/features/place/Scene';
import { mapById } from '@/features/place/roomLook';
import { MAP_UPDATE_EVENT } from '@/lib/demoCrowd';

/** How long the room hears about a platform update before it happens. */
const HEADS_UP_S = 60;
/** The loading screen; the real one stays up until the new map has loaded. */
const LOADING_MS = 2500;

/**
 * Live map changes (feature 7): nobody has to leave. When the owner picks another map, or the
 * Connecta team publishes an update (after a 60-second banner), everyone sees a short loading screen
 * and lands at the door of the new map. Voice and chat never stop, since only the 3D scene reloads.
 */
export function MapMove({ lookId, mapId, onArrive }: { lookId: string; mapId: string; onArrive: () => void }) {
  const [shown, setShown] = useState(mapId);
  const [moving, setMoving] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const map = mapById(mapId);

  // The owner switched maps: show the loading screen (adjusting state while rendering, React's pattern)
  if (mapId !== shown) {
    setShown(mapId);
    setMoving(`Moving to ${map.name}…`);
  }

  useEffect(() => {
    const start = () => setCountdown(HEADS_UP_S);
    window.addEventListener(MAP_UPDATE_EVENT, start);
    return () => window.removeEventListener(MAP_UPDATE_EVENT, start);
  }, []);

  useEffect(() => {
    if (countdown === null) return;
    const t = setTimeout(() => {
      if (countdown > 1) return setCountdown(countdown - 1);
      setCountdown(null);
      setMoving(`Updating ${map.name}…`);
    }, 1000);
    return () => clearTimeout(t);
  }, [countdown, map.name]);

  useEffect(() => {
    if (!moving) return;
    const t = setTimeout(() => {
      setMoving(null);
      onArrive();
    }, LOADING_MS);
    return () => clearTimeout(t);
  }, [moving, onArrive]);

  return (
    <>
      {countdown !== null && (
        <div className="panel absolute top-3 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full px-4 py-2 text-sm font-bold whitespace-nowrap max-sm:top-[136px]">
          🛠️ {map.name} is getting an update · moving in <span className="font-mono">{countdown}s</span>
        </div>
      )}
      {moving && (
        <div className="fixed inset-0 z-[60] isolate grid place-items-center">
          <Scene roomId={lookId} mapId={mapId} className="blur-sm brightness-75" emojiClass="hidden" />
          <div className="panel flex w-72 flex-col items-center gap-3 p-6 text-center">
            <span className="text-5xl">{map.emoji}</span>
            <p className="text-lg font-black">{moving}</p>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="map-move-bar h-full rounded-full bg-primary" style={{ animationDuration: `${LOADING_MS}ms` }} />
            </div>
            <p className="text-xs text-muted-foreground">Voice and chat keep going. You’ll land at the door.</p>
          </div>
        </div>
      )}
    </>
  );
}
