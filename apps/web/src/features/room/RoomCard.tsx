'use client';

import { useState } from 'react';
import { ChevronDown, Flag, Info, Link2, LogOut, Settings, VolumeX } from 'lucide-react';
import { parseCommonCopy } from '@connecta/shared';
import { toast } from 'sonner';
import { InviteDialog } from '@/features/rooms/InviteDialog';
import type { PlaceRoom } from '@/features/place/model';
import { RoomSettingsDialog } from '@/features/place/RoomSettingsDialog';
import { AboutRoomDialog } from '@/features/place/RoomMenu';
import { ReportRoomDialog } from '@/features/place/ReportRoomDialog';
import { cn } from '@/lib/utils';
import { mapById } from '@/features/place/roomLook';
import type { Room, Server } from '@/lib/roomShape';
import { useDismiss } from './useDismiss';

/**
 * Room card, top left: where you are and everything about the room itself. Collapsed it's just the
 * room. Expanded:
 * - **This room** (for everyone): Invite, and Room settings (owner and mods) or About & rules (members)
 * Your own settings live under the dock's More button, never here: this card is only the room's.
 * - Leave (like Gather there's no "back": you're either in the room or you've left it)
 * Chat lives in its own panel (bottom left), not in here.
 */

export function RoomCard({
  server,
  place,
  room,
  mapId,
  here,
  guest,
  onLeave,
  className,
}: {
  server: Server;
  /** The room from the API (none in Common rooms) */
  place?: PlaceRoom;
  room: Room;
  /** The map it's in now (the owner can switch it while you're inside) */
  mapId: string;
  /** How many people are in this room right now, you included. */
  here: number;
  guest: boolean;
  onLeave: () => void;
  className?: string;
}) {
  const isPublic = server.id === 'public';
  const [open, setOpen] = useState(false);
  const ref = useDismiss<HTMLDivElement>(open, () => setOpen(false));
  const [invite, setInvite] = useState(false);
  const [settings, setSettings] = useState<string | null>(null);
  const [about, setAbout] = useState(false);
  const [report, setReport] = useState(false);
  const canEdit = !guest && !!place?.canEdit;
  const map = mapById(mapId);
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
          {/* This room: what everyone shares. Room settings change it for everyone */}
          <section className="flex flex-col gap-2">
            <h3 className="flex items-baseline justify-between px-1 text-xs font-black">
              This room <span className="text-[11px] font-bold text-muted-foreground">for everyone</span>
            </h3>
            <div className="flex gap-2">
              {/* A Common room shares its public link; a guest can't invite anyone into a room by people */}
              {(isPublic || !guest) && (
                <button
                  onClick={() => (isPublic ? copyCommonLink(room.id) : setInvite(true))}
                  className="flex flex-none items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-extrabold text-primary-foreground hover:bg-primary-ink"
                >
                  <Link2 className="size-4" /> Invite
                </button>
              )}
              {canEdit ? (
                <button
                  onClick={() => setSettings(place!.myRole === 'owner' ? 'overview' : 'members')}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-full border bg-card px-3 py-2 text-sm font-extrabold whitespace-nowrap hover:bg-muted"
                >
                  <Settings className="size-4" /> Room settings
                </button>
              ) : (
                place &&
                !guest && (
                  <button
                    onClick={() => setAbout(true)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-full border bg-card px-3 py-2 text-sm font-extrabold whitespace-nowrap hover:bg-muted"
                  >
                    <Info className="size-4" /> About & rules
                  </button>
                )
              )}
            </div>
            {isPublic && (
              <p className="rounded-2xl bg-sky px-3 py-2 text-xs text-sky-ink">
                <span className="block font-black">Common room · run by Connecta</span>
                Text only, so it’s comfy with strangers: no voice, pictures or videos. Be kind, and report anyone who isn’t from their “…”.
              </p>
            )}
          </section>

          <button
            onClick={onLeave}
            className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-destructive/30 py-2 text-sm font-extrabold text-destructive hover:bg-destructive/10"
          >
            <LogOut className="size-4" /> Leave room
          </button>
          {/* Not your own room, not a Common room (there you report people, not the room) */}
          {!isPublic && place?.myRole !== 'owner' && (
            <button
              onClick={() => setReport(true)}
              className="-mt-1 flex items-center justify-center gap-1 text-[11px] font-bold text-muted-foreground hover:text-foreground hover:underline"
            >
              <Flag className="size-3" /> Report this room
            </button>
          )}
        </div>
      )}
      <ReportRoomDialog roomId={server.id} name={name} open={report} onOpenChange={setReport} />

      {!isPublic && !guest && (
        <>
          {place && <InviteDialog room={place} open={invite} onOpenChange={setInvite} />}
          {place && <RoomSettingsDialog room={place} tab={settings} onClose={() => setSettings(null)} />}
          {place && <AboutRoomDialog room={place} open={about} onOpenChange={setAbout} inRoom />}
        </>
      )}
    </div>
  );
}

/** A Common room's link: whoever opens it drops into one of its copies, like from Discover */
function copyCommonLink(copyId: string) {
  const type = parseCommonCopy(copyId)?.type.id;
  if (!type) return;
  navigator.clipboard?.writeText(`${window.location.origin}/common/${type}`).then(
    () => toast.success('Room link copied'),
    () => toast.error('Couldn’t copy the link'),
  );
}
