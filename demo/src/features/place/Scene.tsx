'use client';

import { cn } from '@/lib/utils';
import { mapById, useRoomLook } from './roomLook';

/** A soft scene gradient per template, for maps without a real picture yet. */
const SCENE: Record<string, string> = {
  cafe: 'from-[#f6c9a0] via-[#e9a77c] to-[#7a4a3a]',
  rooftop: 'from-[#2a2f5b] via-[#4b3f78] to-[#e7a0b8]',
};

/**
 * A still of a room: the owner's thumbnail if they uploaded one (feature 7), else the map's picture
 * (the real screenshot for the Library, a soft gradient for templates that don't have one yet).
 */
export function Scene({
  roomId,
  mapId,
  className,
  emojiClass,
}: {
  roomId: string;
  mapId: string;
  className?: string;
  emojiClass?: string;
}) {
  const look = useRoomLook(roomId, mapId);
  const src = look.thumb ?? (look.mapId === 'library' ? '/screenshot.png' : undefined);
  if (src)
    // eslint-disable-next-line @next/next/no-img-element -- a demo still (or a data URL)
    return <img src={src} alt="" className={cn('absolute inset-0 -z-10 size-full object-cover', className)} />;
  return (
    <div className={cn('absolute inset-0 -z-10 bg-gradient-to-br', SCENE[look.mapId] ?? SCENE.cafe, className)}>
      <span className={cn('absolute right-8 bottom-6 text-7xl opacity-80', emojiClass)}>{mapById(look.mapId).emoji}</span>
    </div>
  );
}
