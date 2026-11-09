'use client';

import { useState, type ReactNode } from 'react';
import { Bell, ChevronDown, Flag, Info, Link2, LogOut, Mic, Settings, Shield, Shirt, VolumeX, type LucideIcon } from 'lucide-react';
import type { SettingsTab } from '@/components/app/SettingsDialog';
import { toast } from 'sonner';
import { InviteDialog } from '@/components/server/InviteDialog';
import { placeRoom } from '@/features/place/model';
import { RoomSettingsDialog } from '@/features/place/RoomSettingsDialog';
import { AboutRoomDialog } from '@/features/place/RoomMenu';
import { ReportRoomDialog } from '@/features/place/ReportRoomDialog';
import { cn } from '@/lib/utils';
import { mapById, useRoomLook } from '@/features/place/roomLook';
import type { Room, Server } from '@/lib/mock';
import { useDismiss } from './useDismiss';

/** The shortcuts people look for in a room; everything else is under "All your settings". */
const MY_TABS: [SettingsTab, LucideIcon, string][] = [
  ['character', Shirt, 'My look'],
  ['voice', Mic, 'Voice & sound'],
  ['notifications', Bell, 'Notifications'],
  ['privacy', Shield, 'Privacy'],
];

/**
 * Room card, top left: where you are and everything about the room itself. Collapsed it's just the
 * room. Expanded:
 * - **This room** (for everyone): Invite, and Room settings (owner and mods) or About & rules (members)
 * - **Your settings** (only you): shortcuts into your own settings (look, voice, notifications,
 *   privacy), battery saver and click to walk. Kept apart so an owner never mixes up the two.
 * - Leave (like Gather there's no "back": you're either in the room or you've left it)
 * Chat lives in its own panel (bottom left), not in here.
 */

export function RoomCard({
  server,
  room,
  here,
  guest,
  view,
  onMySettings,
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
  /** Opens your own settings on a tab (guests have none). */
  onMySettings?: (tab: SettingsTab) => void;
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
  // "View as" remounts the room, so the role is read once
  const [place] = useState(() => (isPublic ? null : placeRoom(server)));
  const canEdit = !guest && !!place?.myRole;
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
          {/* This room: what everyone shares. Room settings change it for everyone */}
          <section className="flex flex-col gap-2">
            <h3 className="flex items-baseline justify-between px-1 text-xs font-black">
              This room <span className="text-[11px] font-bold text-muted-foreground">for everyone</span>
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => (isPublic || guest ? toast.success('Room link copied') : setInvite(true))}
                className="flex flex-none items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-extrabold text-primary-foreground hover:bg-primary-ink"
              >
                <Link2 className="size-4" /> Invite
              </button>
              {canEdit ? (
                <button
                  onClick={() => setSettings(place!.myRole === 'Owner' ? 'overview' : 'members')}
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

          {/* Just for you: your own settings, never the room's */}
          <section className="flex flex-col gap-2 rounded-2xl bg-muted/60 p-2.5">
            <h3 className="flex items-baseline justify-between px-0.5 text-xs font-black">
              Your settings <span className="text-[11px] font-bold text-muted-foreground">only you</span>
            </h3>
            {onMySettings && (
              <div className="grid grid-cols-2 gap-1.5">
                {MY_TABS.map(([tab, Icon, label]) => (
                  <button
                    key={tab}
                    onClick={() => onMySettings(tab)}
                    className="flex items-center gap-1.5 rounded-xl bg-card px-2.5 py-2 text-xs font-extrabold hover:bg-secondary hover:text-secondary-foreground"
                  >
                    <Icon className="size-3.5 flex-none text-primary" /> {label}
                  </button>
                ))}
              </div>
            )}
            {view}
            {onMySettings && (
              <button
                onClick={() => onMySettings('profile')}
                className="px-1 text-left text-[11px] font-bold text-muted-foreground hover:text-foreground hover:underline"
              >
                All your settings →
              </button>
            )}
          </section>

          <button
            onClick={onLeave}
            className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-destructive/30 py-2 text-sm font-extrabold text-destructive hover:bg-destructive/10"
          >
            <LogOut className="size-4" /> Leave room
          </button>
          {/* Not your own room, not a Common room (there you report people, not the room) */}
          {!isPublic && place?.myRole !== 'Owner' && (
            <button
              onClick={() => setReport(true)}
              className="-mt-1 flex items-center justify-center gap-1 text-[11px] font-bold text-muted-foreground hover:text-foreground hover:underline"
            >
              <Flag className="size-3" /> Report this room
            </button>
          )}
        </div>
      )}
      <ReportRoomDialog name={name} open={report} onOpenChange={setReport} />

      {!isPublic && !guest && (
        <>
          <InviteDialog server={server} open={invite} onOpenChange={setInvite} />
          {place && <RoomSettingsDialog room={place} tab={settings} onClose={() => setSettings(null)} />}
          {place && <AboutRoomDialog room={place} open={about} onOpenChange={setAbout} inRoom />}
        </>
      )}
    </div>
  );
}
