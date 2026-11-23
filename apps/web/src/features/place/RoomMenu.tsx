'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCheck,
  Flag,
  Info,
  Link2,
  LogOut,
  MessageCircle,
  MoreHorizontal,
  Pin,
  PinOff,
  Play,
  Settings,
  UserPlus,
} from 'lucide-react';
import { toast } from 'sonner';
import { ReportRoomDialog } from './ReportRoomDialog';
import { InviteDialog } from '@/features/rooms/InviteDialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useMe } from '@/features/account/useMe';
import { roomsApi, useRoomAction } from '@/features/rooms/useRooms';
import { cn } from '@/lib/utils';
import { chatHref, ROLE_LABEL, walkInHref, type PlaceRoom } from './model';
import { RoomSettingsDialog } from './RoomSettingsDialog';
import { Scene } from './Scene';

const VISIBILITY = { private: 'Private · invite only', request: 'Ask to join · listed', open: 'Open · anyone can walk in' } as const;

/**
 * The "…" on a room (Home cards and rows, the Chat page): everything you can do with a room without
 * walking in. Owners and mods edit it from here too, so there's no need to enter 3D to fix a setting.
 */
export function RoomMenu({
  room,
  pinned,
  onPin,
  unread,
  onRead,
  className,
}: {
  room: PlaceRoom;
  pinned: boolean;
  onPin: () => void;
  unread: number;
  onRead: () => void;
  className?: string;
}) {
  const [about, setAbout] = useState(false);
  const [invite, setInvite] = useState(false);
  const [settings, setSettings] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [report, setReport] = useState(false);
  const router = useRouter();
  const notify = useRoomAction(roomsApi.myPlace, () => toast.success('Saved'));
  const leave = useRoomAction(roomsApi.leave, () => {
    toast(`You left ${room.name}`);
    router.push('/home');
  });
  const canEdit = room.canEdit;

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button className={cn('grid size-8 place-items-center rounded-full', className)} aria-label={`More for ${room.name}`}>
            <MoreHorizontal className="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60 rounded-2xl p-1.5">
          <DropdownMenuItem onSelect={() => setAbout(true)}>
            <Info /> About this room
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setInvite(true)}>
            <UserPlus /> Invite friends
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              navigator.clipboard?.writeText(`${window.location.origin}${chatHref(room)}`).catch(() => {});
              toast.success('Room link copied');
            }}
          >
            <Link2 /> Copy room link
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={onPin}>
            {pinned ? <PinOff /> : <Pin />} {pinned ? 'Unpin' : 'Pin to the top'}
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!unread} onSelect={onRead}>
            <CheckCheck /> Mark as read
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Bell className="size-4" /> Notifications
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="rounded-2xl p-1.5">
              <DropdownMenuRadioGroup
                value={room.room.me.notify}
                onValueChange={(v) => notify.mutate({ id: room.id, notify: v as 'all' | 'mentions' | 'none' })}
              >
                <DropdownMenuRadioItem value="all">Every message</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="mentions">Only @mentions (default)</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="none">Nothing</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          {canEdit && (
            <DropdownMenuItem onSelect={() => setSettings('overview')}>
              <Settings /> Room settings
            </DropdownMenuItem>
          )}
          {room.myRole !== 'owner' && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setReport(true)}>
                <Flag /> Report room
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onSelect={() => setLeaving(true)}>
                <LogOut /> Leave room
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AboutRoomDialog room={room} open={about} onOpenChange={setAbout} onSettings={canEdit ? () => setSettings('overview') : undefined} />
      <InviteDialog room={room} open={invite} onOpenChange={setInvite} />
      <ReportRoomDialog roomId={room.id} name={room.name} open={report} onOpenChange={setReport} />
      <RoomSettingsDialog room={room} tab={settings} onClose={() => setSettings(null)} />
      <Dialog open={leaving} onOpenChange={setLeaving}>
        <DialogContent className="max-w-[calc(100%-2rem)] rounded-3xl sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-black">Leave {room.name}?</DialogTitle>
            <DialogDescription>
              It leaves your Home and you stop getting its chat.{' '}
              {room.visibility === 'open' ? 'It’s open, so you can join again any time.' : 'You’ll need a new invite to come back.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="rounded-full font-extrabold" onClick={() => setLeaving(false)}>
              Stay
            </Button>
            <Button
              className="rounded-full bg-destructive font-extrabold text-white hover:bg-destructive/90"
              disabled={leave.isPending}
              onClick={() => {
                setLeaving(false);
                leave.mutate(room.id);
              }}
            >
              Leave room
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * The room's full info in one place, for anyone in it: what it is, who runs it, how big it is and
 * what's coming up. Owners and mods jump from here to Settings to change it.
 */
export function AboutRoomDialog({
  room,
  open,
  onOpenChange,
  onSettings,
  inRoom = false,
}: {
  room: PlaceRoom;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSettings?: () => void;
  /** Opened from inside the 3D room: no Walk in or Chat (Chat would leave the room). */
  inRoom?: boolean;
}) {
  const r = room.room;
  const { data: me } = useMe();
  const you = (p: { id: string; name: string }) => (p.id === me?.id ? 'You' : p.name);
  const facts: [string, string][] = [
    ['Map', `${room.map.emoji} ${room.map.name}`],
    ['Who can join', VISIBILITY[r.visibility]],
    ['Members', `${r.memberCount} of ${r.maxMembers.toLocaleString()}`],
    ['Inside now', `${room.inside} of ${room.capacity}${room.full ? ' · full' : ''}`],
    ['Owner', you(r.owner)],
    ['Mods', r.mods.length ? r.mods.map(you).join(', ') : 'None yet'],
    ['Plan', room.ownerPlus ? 'Plus (the owner’s)' : 'Free'],
    ['You', r.me.role ? ROLE_LABEL[r.me.role] : r.me.guestUntil ? 'Guest' : 'Visitor'],
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] gap-0 overflow-hidden rounded-3xl p-0 sm:max-w-lg">
        <div className="relative isolate h-36">
          <Scene roomId={room.id} mapId={room.map.id} emojiClass="text-6xl" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/60 to-transparent" />
          <p className="absolute bottom-3 left-4 flex items-center gap-2 text-2xl font-black text-white">
            <span className={cn('grid size-10 place-items-center rounded-xl text-xl', room.tint)}>{room.emoji}</span>
            {room.name}
          </p>
        </div>
        <div className="flex flex-col gap-4 p-5">
          <DialogHeader className="sr-only">
            <DialogTitle>About {room.name}</DialogTitle>
          </DialogHeader>
          <DialogDescription className="text-foreground">{room.description || room.map.blurb}</DialogDescription>
          {r.rules && (
            <section className="rounded-2xl bg-muted/60 px-3 py-2.5">
              <p className="text-[11px] font-black tracking-wider text-muted-foreground uppercase">Room rules</p>
              <p className="mt-1 text-sm whitespace-pre-line">{r.rules}</p>
            </section>
          )}
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {facts.map(([k, v]) => (
              <div key={k}>
                <dt className="text-[11px] font-black tracking-wider text-muted-foreground uppercase">{k}</dt>
                <dd className="font-bold">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-wrap gap-2">
            {inRoom ? null : room.full ? (
              <Button className="rounded-full font-extrabold" onClick={() => toast.success('We’ll tell you when a spot opens')}>
                <Bell /> Full · tell me when there’s space
              </Button>
            ) : (
              <Button asChild className="rounded-full font-extrabold">
                <Link href={walkInHref(room)}>
                  <Play className="fill-current" /> Walk in
                </Link>
              </Button>
            )}
            {!inRoom && (
              <Button asChild variant="outline" className="rounded-full font-extrabold">
                <Link href={chatHref(room)}>
                  <MessageCircle /> Chat
                </Link>
              </Button>
            )}
            {onSettings && (
              <Button
                variant="ghost"
                className="rounded-full font-extrabold"
                onClick={() => {
                  onOpenChange(false);
                  onSettings();
                }}
              >
                <Settings /> Settings
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
