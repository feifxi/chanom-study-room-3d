'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Bell,
  CalendarHeart,
  CheckCheck,
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
import { InviteDialog } from '@/components/server/InviteDialog';
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
import { cn } from '@/lib/utils';
import { userById } from '@/lib/mock';
import { chatHref, planOf, walkInHref, type PlaceRoom } from './model';
import { RoomSettingsDialog } from './RoomSettingsDialog';
import { Scene } from './Scene';

const VISIBILITY = { private: 'Private · invite only', request: 'Ask to join · listed', public: 'Open · anyone can walk in' } as const;

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
  const [notify, setNotify] = useState('mentions');
  const canEdit = !!room.myRole;

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
              navigator.clipboard?.writeText(`https://connecta.app/r/${room.id}`).catch(() => {});
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
              <DropdownMenuRadioGroup value={notify} onValueChange={setNotify}>
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
          {room.myRole !== 'Owner' && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setLeaving(true)}>
                <LogOut /> Leave room
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AboutRoomDialog room={room} open={about} onOpenChange={setAbout} onSettings={canEdit ? () => setSettings('overview') : undefined} />
      <InviteDialog server={room.server} open={invite} onOpenChange={setInvite} />
      <RoomSettingsDialog room={room} tab={settings} onClose={() => setSettings(null)} />
      <Dialog open={leaving} onOpenChange={setLeaving}>
        <DialogContent className="max-w-[calc(100%-2rem)] rounded-3xl sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-black">Leave {room.name}?</DialogTitle>
            <DialogDescription>
              It leaves your Home and you stop getting its chat.{' '}
              {room.server.visibility === 'public'
                ? 'It’s open, so you can join again any time.'
                : 'You’ll need a new invite to come back.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="rounded-full font-extrabold" onClick={() => setLeaving(false)}>
              Stay
            </Button>
            <Button
              className="rounded-full bg-destructive font-extrabold text-white hover:bg-destructive/90"
              onClick={() => {
                setLeaving(false);
                toast(`You left ${room.name}`);
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
}: {
  room: PlaceRoom;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSettings?: () => void;
}) {
  const s = room.server;
  const ownerId = Object.keys(s.roles).find((id) => s.roles[id] === 'Owner') ?? s.members[1] ?? 'me';
  const mods = Object.keys(s.roles).filter((id) => s.roles[id] === 'Mod');
  const facts: [string, string][] = [
    ['Map', `${room.map.emoji} ${room.map.name}`],
    ['Who can join', VISIBILITY[s.visibility]],
    ['Members', `${s.memberCount} of ${planOf(room.ownerPlus).members.toLocaleString()}`],
    ['Inside now', `${room.inside} of ${room.capacity}${room.full ? ' · full' : ''}`],
    ['Owner', ownerId === 'me' ? 'You' : userById(ownerId).name],
    ['Mods', mods.length ? mods.map((id) => (id === 'me' ? 'You' : userById(id).name)).join(', ') : 'None yet'],
    ['Plan', room.ownerPlus ? 'Plus (the owner’s)' : 'Free'],
    ['You', room.myRole ?? 'Member'],
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
          <DialogDescription className="text-foreground">{room.description}</DialogDescription>
          {s.event && (
            <p className="flex items-center gap-1.5 rounded-2xl bg-lavender px-3 py-2 text-sm font-bold text-lavender-ink">
              <CalendarHeart className="size-4" /> {s.event}
            </p>
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
            {room.full ? (
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
            <Button asChild variant="outline" className="rounded-full font-extrabold">
              <Link href={chatHref(room)}>
                <MessageCircle /> Chat
              </Link>
            </Button>
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
