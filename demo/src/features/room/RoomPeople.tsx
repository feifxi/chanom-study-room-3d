'use client';

import { useState } from 'react';
import { ChevronRight, HeadphoneOff, LocateFixed, MicOff, Users } from 'lucide-react';
import { UserAvatar } from '@/components/UserAvatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface RoomPerson {
  id: string;
  name: string;
  color: string;
  status: string;
  guest?: boolean;
  you?: boolean;
  micOn?: boolean;
  speaking?: boolean;
  /** Can't hear the room (headphones off). */
  deafened?: boolean;
}

/**
 * Who's in the room, on the right. Folded it's a slim rail of faces (mirroring the tools rail on the
 * left) that still shows who's talking or deafened; unfolded it's the full list. Tap someone and an
 * arrow in the room points the way.
 */
export function RoomPeople({
  people,
  findId,
  onFind,
  startOpen = false,
  className,
}: {
  people: RoomPerson[];
  findId: string | null;
  onFind: (id: string | null) => void;
  startOpen?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(startOpen);

  if (!open)
    return (
      <nav className={cn('panel flex flex-col items-center gap-1.5 p-1.5', className)} aria-label="In this room">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setOpen(true)}
              className="flex size-11 flex-col items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label={`Show everyone in this room (${people.length})`}
            >
              <Users className="size-4" />
              <span className="text-[10px] leading-none font-black">{people.length}</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="left">In this room · {people.length}</TooltipContent>
        </Tooltip>
        <span className="h-px w-6 bg-border" />
        <div className="flex max-h-[min(420px,calc(100dvh-220px))] flex-col items-center gap-1.5 overflow-y-auto py-0.5">
          {people.map((p) => (
            <Tooltip key={p.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onFind(findId === p.id ? null : p.id)}
                  className={cn('relative rounded-full', findId === p.id && 'ring-2 ring-primary ring-offset-2 ring-offset-card')}
                  aria-label={`Find ${p.name}`}
                >
                  <UserAvatar
                    user={{ name: p.name, color: p.color, presence: 'online' }}
                    size={36}
                    ring={p.speaking ? 'speaking' : undefined}
                  />
                  <VoiceBadge p={p} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="left">
                {p.name}
                {p.you && ' (you)'} · {p.status}
                {p.deafened && ' · deafened'}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </nav>
    );

  return (
    // Kept small on purpose: it only answers "who's here", so it shouldn't cover the room
    <section className={cn('panel flex w-[200px] flex-col p-1.5', className)} aria-label="In this room">
      <button onClick={() => setOpen(false)} className="flex items-center gap-1.5 rounded-xl px-2 py-1 text-left hover:bg-muted">
        <Users className="size-3.5 text-muted-foreground" />
        <h2 className="flex-1 text-xs font-black">{people.length} here</h2>
        <ChevronRight className="size-3.5 text-muted-foreground" aria-label="Fold" />
      </button>
      <div className="flex max-h-[min(320px,calc(100dvh-220px))] flex-col overflow-y-auto">
        {people.map((p) => (
          <button
            key={p.id}
            onClick={() => onFind(findId === p.id ? null : p.id)}
            title={`${p.status}${p.deafened ? ' · deafened' : ''} · tap to find`}
            className={cn('flex items-center gap-2 rounded-lg px-1.5 py-1 text-left', findId === p.id ? 'bg-secondary' : 'hover:bg-muted')}
          >
            <span className="relative flex-none">
              <UserAvatar
                user={{ name: p.name, color: p.color, presence: 'online' }}
                size={24}
                ring={p.speaking ? 'speaking' : undefined}
              />
              <VoiceBadge p={p} small />
            </span>
            <span className="min-w-0 flex-1 truncate text-xs font-bold">
              {p.name}
              {p.you && ' (you)'}
            </span>
            {p.guest && <span className="rounded-full bg-peach px-1 text-[9px] font-black text-peach-ink">guest</span>}
            {findId === p.id ? (
              <LocateFixed className="size-3.5 flex-none text-primary" />
            ) : (
              <span className="flex-none text-xs">{statusIcon(p.status)}</span>
            )}
          </button>
        ))}
      </div>
    </section>
  );
}

/** Just the emoji of a status ("📖 Focusing · Calculus · 32m" → 📖); the full text is in the tooltip. */
const statusIcon = (status: string) => status.match(/^\p{Extended_Pictographic}/u)?.[0] ?? '';

/** Small corner badge on a face: deafened beats muted; nothing when the mic is just on. */
function VoiceBadge({ p, small }: { p: RoomPerson; small?: boolean }) {
  if (!p.deafened && p.micOn) return null;
  const Icon = p.deafened ? HeadphoneOff : MicOff;
  return (
    <span
      className={cn(
        small
          ? 'absolute -right-1 -bottom-1 grid size-3.5 place-items-center rounded-full border border-card'
          : 'absolute -right-1 -bottom-1 grid size-4 place-items-center rounded-full border-2 border-card',
        p.deafened ? 'bg-destructive text-white' : 'bg-muted text-muted-foreground',
      )}
    >
      <Icon className="size-2.5" />
    </span>
  );
}
