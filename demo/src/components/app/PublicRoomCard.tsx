import Link from 'next/link';
import { VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MAPS, PUBLIC_ROOMS } from '@/lib/mock';

/** One open public room: its template, how full it is, and that a new copy opens when it fills up. */
export function PublicRoomCard({ room }: { room: (typeof PUBLIC_ROOMS)[number] }) {
  const map = MAPS.find((m) => m.id === room.mapId)!;
  const full = room.people / room.capacity;
  return (
    <Link
      href={`/servers/public/rooms/${room.id}`}
      className="group flex flex-col rounded-3xl border bg-background/60 p-3 transition-shadow hover:shadow-soft"
    >
      <span className={cn('relative grid h-24 place-items-center rounded-2xl text-4xl', map.tint)}>
        {map.emoji}
        <span className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-card/85 px-2 py-0.5 text-[11px] font-bold">
          <span className="size-1.5 rounded-full bg-online" /> {room.people} here
        </span>
      </span>
      <p className="mt-2 flex items-center gap-1 font-black">
        {room.name}
        {room.quiet && <VolumeX className="size-3.5 text-muted-foreground" aria-label="Quiet room" />}
      </p>
      <p className="text-xs text-muted-foreground">{room.vibe}</p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={cn('h-full rounded-full', full > 0.85 ? 'bg-tea' : 'bg-primary')} style={{ width: `${full * 100}%` }} />
      </div>
      <p className="mt-1 font-mono text-[11px] text-muted-foreground">
        {room.people}/{room.capacity}
        {full > 0.85 && ' · almost full, a new one opens'}
      </p>
    </Link>
  );
}
