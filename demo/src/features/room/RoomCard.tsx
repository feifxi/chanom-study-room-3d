'use client';

import { useState, type ReactNode } from 'react';
import { ChevronDown, Link2, LogOut, Settings, VolumeX } from 'lucide-react';
import { toast } from 'sonner';
import { InviteDialog } from '@/components/server/InviteDialog';
import { placeRoom } from '@/features/place/model';
import { RoomSettingsDialog } from '@/features/place/RoomSettingsDialog';
import { cn } from '@/lib/utils';
import { mapById, useRoomLook } from '@/features/place/roomLook';
import type { Room, Server } from '@/lib/mock';
import { useDismiss } from './useDismiss';

/**
 * Room card, top left: where you are and everything about the room itself. Collapsed it's just the
 * room. Expanded:
 * - Invite and (for members) the room's Settings
 * - Battery saver: only you see the change
 * - Leave (like Gather there's no "back": you're either in the room or you've left it)
 * Chat lives in its own panel (bottom left), not in here.
 */
export function RoomCard({
  server,
  room,
  here,
  guest,
  view,
  onLeave,
  className,
}: {
  server: Server;
  room: Room;
  /** How many people are in this room right now, you included. */
  here: number;
  guest: boolean;
  /** Your own view controls (battery saver). */
  view: ReactNode;
  onLeave: () => void;
  className?: string;
}) {
  const isPublic = server.id === 'public';
  const [open, setOpen] = useState(false);
  const ref = useDismiss<HTMLDivElement>(open, () => setOpen(false));
  const [invite, setInvite] = useState(false);
  const [settings, setSettings] = useState<string | null>(null);
  const look = useRoomLook(isPublic ? `public:${room.id}` : server.id, room.mapId);
  const map = mapById(look.mapId);
  const name = isPublic ? room.name : server.name;

  return (
    // items-start: the collapsed card hugs the room's name instead of a fixed width
    <div ref={ref} className={cn('flex flex-col items-start gap-2', className)}>
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={`Room: ${name}`}
        className={cn('panel flex max-w-full items-center gap-2.5 p-2 pr-4 text-left', open && 'bg-secondary')}
      >
        <span className={cn('grid size-11 flex-none place-items-center rounded-2xl text-xl', server.tint)}>
          {isPublic ? map.emoji : server.emoji}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1 text-[15px] font-black">
            <span className="truncate">{name}</span>
            <ChevronDown className={cn('size-4 flex-none transition-transform', open && 'rotate-180')} />
          </span>
          <span className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
            <span className="size-2 flex-none rounded-full bg-online" />
            {map.emoji} {map.name} · {here} here
            {!room.roomWideGames && <VolumeX className="size-3 flex-none" aria-label="No room-wide games" />}
            {guest && <span className="rounded-full bg-peach px-1.5 text-[10px] font-black text-peach-ink">guest</span>}
          </span>
        </span>
      </button>

      {open && (
        <div className="panel flex max-h-[calc(100dvh-110px)] w-[300px] max-w-full flex-col gap-3 overflow-y-auto p-3">
          <div className="flex gap-2">
            <button
              onClick={() => (isPublic || guest ? toast.success('Room link copied') : setInvite(true))}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-extrabold text-primary-foreground hover:bg-primary-ink"
            >
              <Link2 className="size-4" /> Invite friends
            </button>
            {!isPublic && !guest && (
              <button
                onClick={() => setSettings('overview')}
                className="flex items-center gap-1.5 rounded-full border bg-card px-4 py-2 text-sm font-extrabold hover:bg-muted"
              >
                <Settings className="size-4" /> Settings
              </button>
            )}
          </div>

          <section className="flex flex-col gap-1.5 rounded-2xl bg-muted/60 p-2.5">
            <h3 className="flex items-baseline justify-between px-0.5 text-xs font-black">
              Your view <span className="text-[11px] font-bold text-muted-foreground">only you see this</span>
            </h3>
            {view}
          </section>

          <button
            onClick={onLeave}
            className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-destructive/30 py-2 text-sm font-extrabold text-destructive hover:bg-destructive/10"
          >
            <LogOut className="size-4" /> Leave room
          </button>
        </div>
      )}

      {!isPublic && !guest && (
        <>
          <InviteDialog server={server} open={invite} onOpenChange={setInvite} />
          <RoomSettingsDialog room={placeRoom(server)} tab={settings} onClose={() => setSettings(null)} />
        </>
      )}
    </div>
  );
}
