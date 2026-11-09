'use client';

import { Megaphone, ShieldCheck } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

/**
 * Room tools on the dock, for the owner and mods only (members never see the button). Owner-only
 * powers live here so the dock stays short as tools are added; today that's talking to everyone
 * (an announcement heard at full volume anywhere in the room). Mute all, spotlight and switching
 * the map join it later.
 */
export function RoomAdmin({ compact, onAir, onToggleAir }: { compact: boolean; onAir: boolean; onToggleAir: () => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button aria-label="Room tools" className={cn('dock-btn', compact && 'min-w-0 px-3', onAir && 'dock-btn-live')}>
          <ShieldCheck className="size-5" />
          {!compact && (onAir ? 'On air' : 'Room')}
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="center" sideOffset={10} className="w-72 rounded-2xl p-1.5">
        <p className="px-2 pt-1 pb-1.5 text-[11px] font-bold text-muted-foreground">Room tools · owner and mods</p>
        <button
          onClick={onToggleAir}
          aria-pressed={onAir}
          className={cn('flex w-full items-start gap-2.5 rounded-xl p-2 text-left hover:bg-muted', onAir && 'bg-secondary')}
        >
          <span className="grid size-8 flex-none place-items-center rounded-lg bg-primary/15 text-primary">
            <Megaphone className="size-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-extrabold">{onAir ? 'Stop talking to everyone' : 'Talk to everyone'}</span>
            <span className="block text-[11px] leading-snug text-muted-foreground">
              Everyone in the room hears your voice, wherever they are. For announcements.
            </span>
          </span>
        </button>
      </PopoverContent>
    </Popover>
  );
}
