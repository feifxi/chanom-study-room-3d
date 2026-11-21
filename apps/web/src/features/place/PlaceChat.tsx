'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Bell, CalendarHeart, MessageCircle, Play, Crown, UserPlus } from 'lucide-react';
import { ChatThread } from '@/components/chat/Chat';
import { InviteDialog } from '@/components/server/InviteDialog';
import { PRESENCE_LABEL, UserAvatar } from '@/components/UserAvatar';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { channelMessages, userById, type Server } from '@/lib/mock';
import { placeRoom, walkInHref } from './model';
import { RoomMenu } from './RoomMenu';
import { Scene } from './Scene';

/**
 * Place layout, a room's permanent chat outside 3D: the chat full size over a still of the room,
 * who's inside on the side, and one tap to walk in. Nobody sees you here and voice is off. It's how
 * phones, slow laptops and a quick reply use a room; in 3D the same chat opens as a panel.
 */
export function PlaceChat({ server }: { server: Server }) {
  const room = placeRoom(server);
  const [invite, setInvite] = useState(false);
  const [pinned, setPinned] = useState(server.id === 'chanom');
  const inside = room.people.map(userById);
  const away = server.members.filter((id) => id !== 'me' && !room.people.includes(id)).map(userById);

  return (
    <div className="fixed inset-0 isolate flex flex-col gap-3 p-3">
      <Scene roomId={room.id} mapId={room.map.id} className="fixed" emojiClass="text-[9rem]" />
      <div className="fixed inset-0 -z-10 bg-black/35 backdrop-blur-sm" />

      <header className="panel flex flex-none items-center gap-2 p-2">
        <Link
          href="/home"
          className="grid size-9 flex-none place-items-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Back to your rooms"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <span className={cn('grid size-9 flex-none place-items-center rounded-2xl text-lg sm:size-11 sm:text-xl', room.tint)}>
          {room.emoji}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-[15px] font-black">
            <span className="truncate">{room.name}</span>
            {room.ownerPlus && (
              // Phones need the width for the room's name; the badge is only a perk label
              <span className="hidden flex-none items-center gap-0.5 rounded-full bg-lavender px-1.5 text-[10px] font-black text-lavender-ink sm:flex">
                <Crown className="size-3" /> Plus
              </span>
            )}
          </span>
          <span className="flex items-center gap-1.5 truncate text-xs font-semibold text-muted-foreground">
            <span className={cn('size-2 flex-none rounded-full', inside.length ? 'bg-online' : 'bg-muted-foreground/50')} />
            {room.map.emoji} {room.map.name} ·{' '}
            <span className="font-mono">
              {room.inside}/{room.capacity}
            </span>{' '}
            {room.full ? 'inside · full' : 'inside'}
          </span>
        </span>
        <Button
          size="icon-sm"
          variant="ghost"
          className="hidden rounded-full text-primary sm:inline-flex"
          aria-label="Invite"
          onClick={() => setInvite(true)}
        >
          <UserPlus />
        </Button>
        <RoomMenu
          room={room}
          pinned={pinned}
          onPin={() => setPinned(!pinned)}
          unread={0}
          onRead={() => {}}
          className="text-muted-foreground hover:bg-muted hover:text-foreground"
        />
        {room.full ? (
          <Button className="h-10 rounded-full px-4 font-black sm:px-5" onClick={() => toast.success('We’ll tell you when a spot opens')}>
            <Bell /> Full<span className="hidden sm:inline"> · notify me</span>
          </Button>
        ) : (
          <Button asChild className="h-10 rounded-full px-3 font-black sm:px-5">
            <Link href={walkInHref(room)}>
              <Play className="fill-current" /> Walk in
            </Link>
          </Button>
        )}
      </header>

      <div className="flex min-h-0 flex-1 gap-3">
        <section className="panel flex min-w-0 flex-1 flex-col overflow-hidden" aria-label="Room chat">
          <div className="flex items-center gap-2 border-b px-4 py-2.5">
            <MessageCircle className="size-4 text-muted-foreground" />
            <p className="flex-1 text-sm font-black">Room chat</p>
            <p className="hidden text-xs text-muted-foreground sm:block">You’re reading from outside · nobody sees you</p>
          </div>
          {server.event && (
            <p className="mx-3 mt-3 flex items-center gap-1.5 rounded-2xl bg-lavender px-3 py-2 text-sm font-bold text-lavender-ink">
              <CalendarHeart className="size-4" /> {server.event}
            </p>
          )}
          <ChatThread
            key={server.id}
            initial={room.chat ? channelMessages(server.id, room.chat.id) : []}
            unread={room.chat?.unread}
            members={server.members}
            moderator={!!room.myRole}
            placeholder="Message the room"
          />
        </section>

        <aside className="panel hidden w-72 flex-none flex-col gap-3 overflow-y-auto p-3 lg:flex" aria-label="People">
          <Group title="About">
            <p className="px-1 text-sm">{room.description}</p>
            <p className="mt-1 px-1 text-xs text-muted-foreground">
              {server.memberCount} members · {room.myRole ? `you’re ${room.myRole === 'Owner' ? 'the owner' : 'a mod'}` : 'you’re a member'}
            </p>
          </Group>
          <Group title={`Inside now · ${room.inside}`}>
            {inside.length ? (
              inside.map((u) => <Person key={u.id} id={u.id} />)
            ) : (
              <p className="px-1 text-sm text-muted-foreground">Lights off. Walk in first and friends will see you there.</p>
            )}
            {room.inside > inside.length && inside.length > 0 && (
              <p className="px-1 pt-1 text-xs font-bold text-muted-foreground">and {room.inside - inside.length} more</p>
            )}
          </Group>
          <Group title="Members">
            {away.map((u) => (
              <Person key={u.id} id={u.id} />
            ))}
          </Group>
        </aside>
      </div>

      <InviteDialog server={server} open={invite} onOpenChange={setInvite} />
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 px-1 text-[11px] font-black tracking-wider text-muted-foreground uppercase">{title}</p>
      {children}
    </div>
  );
}

function Person({ id }: { id: string }) {
  const u = userById(id);
  return (
    <div className={cn('flex items-center gap-2 rounded-xl px-1 py-1', u.presence === 'offline' && 'opacity-50')}>
      <UserAvatar user={u} size={30} presence />
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold">{u.name}</span>
        <span className="block truncate text-[11px] text-muted-foreground">{u.activity ?? PRESENCE_LABEL[u.presence]}</span>
      </span>
    </div>
  );
}
