import { cn } from '@/lib/utils';
import { MAPS } from '@/lib/mock';

/** A soft scene gradient per template, for maps without a real picture yet. */
const SCENE: Record<string, string> = {
  cafe: 'from-[#f6c9a0] via-[#e9a77c] to-[#7a4a3a]',
  rooftop: 'from-[#2a2f5b] via-[#4b3f78] to-[#e7a0b8]',
  lounge: 'from-[#c9e6d3] via-[#8fc4b0] to-[#3d6b63]',
};

/**
 * A still of a room: the real screenshot for the Library, a soft gradient for templates that don't
 * have one yet. In the real app this is a snapshot of the room as it is right now.
 */
export function Scene({ mapId, className, emojiClass }: { mapId: string; className?: string; emojiClass?: string }) {
  if (mapId === 'library')
    // eslint-disable-next-line @next/next/no-img-element -- a demo still
    return <img src="/screenshot.png" alt="" className={cn('absolute inset-0 -z-10 size-full object-cover', className)} />;
  return (
    <div className={cn('absolute inset-0 -z-10 bg-gradient-to-br', SCENE[mapId] ?? SCENE.cafe, className)}>
      <span className={cn('absolute right-8 bottom-6 text-7xl opacity-80', emojiClass)}>{MAPS.find((m) => m.id === mapId)?.emoji}</span>
    </div>
  );
}
