'use client';

import { useEffect, useState } from 'react';
import { Scene } from '@/features/place/Scene';
import { mapById } from '@/features/place/roomLook';

/** The loading screen; the real one stays up until the new map has loaded. */
const LOADING_MS = 2500;

/**
 * Live map changes (docs/features/06-maps.md): nobody has to leave. When the owner picks another map, or the
 * Connecta team publishes an update (after a 60-second banner), everyone sees a short loading screen
 * and lands at the door of the new map. Voice and chat never stop, since only the 3D scene reloads.
 */
export function MapMove({ mapId, onArrive }: { mapId: string; onArrive: () => void }) {
  const [shown, setShown] = useState(mapId);
  const [moving, setMoving] = useState<string | null>(null);
  const map = mapById(mapId);

  // The owner switched maps: show the loading screen (adjusting state while rendering, React's pattern)
  if (mapId !== shown) {
    setShown(mapId);
    setMoving(`Moving to ${map.name}…`);
  }

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
      {moving && (
        <div className="fixed inset-0 z-[60] isolate grid place-items-center">
          <Scene mapId={mapId} className="blur-sm brightness-75" emojiClass="hidden" />
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
