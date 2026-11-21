'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Users, VolumeX } from 'lucide-react';
import { JoinRoomDialog } from '@/features/place/JoinRoomDialog';
import { AvatarStack } from '@/components/UserAvatar';
import { cn } from '@/lib/utils';
import { commonCopyFor, MAPS, serverById, userById, type CommonRoom, type OpenRoom } from '@/lib/mock';
import { useViewer } from '@/lib/viewer';

type Props = { kind: 'open'; room: OpenRoom } | { kind: 'common'; room: CommonRoom };

/**
 * A room anyone can walk into, on Home ("Open now") and in Discover. Two kinds, labelled so people
 * know what they're getting:
 * - **Open room**: someone made it and set it to Open. It has an owner, members and a saved chat;
 *   one copy only, so full is full: the card shows how full it is.
 * - **Common room**: run by Connecta from a template, anyone welcome (guests too). Text only, no
 *   members, no saved chat; copies open as people come, so it's never full: the card counts
 *   everyone across its copies instead.
 */
export function OpenRoomCard(props: Props) {
  const r = props.room;
  const map = MAPS.find((m) => m.id === r.mapId)!;
  const friends = (r.friendsInside ?? []).map(userById);

  if (props.kind === 'common') {
    const d = props.room;
    return (
      <Link href={`/servers/public/rooms/${commonCopyFor(d.mapId)}`} className={CARD}>
        <Picture tint={map.tint} emoji={map.emoji} label="Common room · by Connecta" dark />
        <p className="mt-2 flex items-center gap-1 font-black">
          <span className="truncate">{d.name}</span>
          {!d.roomWideGames && <VolumeX className="size-3.5 flex-none text-muted-foreground" aria-label="No room-wide games" />}
        </p>
        <p className="line-clamp-1 text-xs text-muted-foreground">{d.vibe}</p>
        <p className="mt-2 flex items-center gap-1.5 text-sm">
          <span className="size-2 rounded-full bg-online" />
          <span className="font-black">{d.here.toLocaleString()} here</span>
          <span className="text-xs text-muted-foreground">
            · {d.copies} {d.copies === 1 ? 'room' : 'rooms'} open
          </span>
        </p>
        <Friends friends={friends} fallback="You’ll land in the liveliest copy" />
        <span className={cn(BUTTON, 'bg-primary text-primary-foreground group-hover:bg-primary-ink')}>Walk in</span>
      </Link>
    );
  }

  return <OpenCard room={props.room} />;
}

/** An open room you're not in yet opens its preview (rules, who's inside) before you join. */
function OpenCard({ room: o }: { room: OpenRoom }) {
  const [preview, setPreview] = useState(false);
  const map = MAPS.find((m) => m.id === o.mapId)!;
  const friends = (o.friendsInside ?? []).map(userById);
  const fill = o.inside / o.capacity;
  const full = o.inside >= o.capacity;
  const mine = serverById(o.id);
  // Guests can look, but open rooms have members, and members need an account
  const guest = useViewer() === 'guest';
  const action = guest
    ? 'Sign up to join'
    : mine
      ? full
        ? 'Full · notify me'
        : 'Walk in'
      : o.ask
        ? 'Ask to join'
        : full
          ? 'Join · full now'
          : 'Join & walk in';
  const body = (
    <>
      <Picture tint={map.tint} emoji={o.emoji} label="Open room" />
      <p className="mt-2 truncate font-black">{o.name}</p>
      <p className="line-clamp-1 text-xs text-muted-foreground">
        {o.blurb} · by {o.owner}
      </p>
      <p className="mt-1 truncate text-[11px] font-bold text-muted-foreground">
        {o.language} · {o.tags.join(', ')}
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full', fill > 0.85 ? 'bg-tea' : 'bg-primary')}
          style={{ width: `${Math.min(1, fill) * 100}%` }}
        />
      </div>
      <p className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
        <span className="font-mono">
          {o.inside}/{o.capacity}
          {full && ' full'}
        </span>
        <span className="flex items-center gap-0.5">
          <Users className="size-3" /> {o.members.toLocaleString()} members
        </span>
      </p>
      <Friends friends={friends} />
      <span
        className={cn(BUTTON, full ? 'bg-muted text-muted-foreground' : 'bg-primary text-primary-foreground group-hover:bg-primary-ink')}
      >
        {action}
      </span>
    </>
  );
  if (guest)
    return (
      <Link href="/login" className={CARD}>
        {body}
      </Link>
    );
  // Already a member: go to the room's page (its chat works even when the room is full)
  return mine ? (
    <Link href={`/servers/${o.id}`} className={CARD}>
      {body}
    </Link>
  ) : (
    <>
      <button className={CARD} onClick={() => setPreview(true)}>
        {body}
      </button>
      <JoinRoomDialog room={o} open={preview} onOpenChange={setPreview} />
    </>
  );
}

const CARD = 'group flex flex-col rounded-3xl border bg-card p-3 text-left transition-shadow hover:shadow-soft';
const BUTTON = 'mt-3 rounded-full py-1.5 text-center text-sm font-extrabold';

function Picture({ tint, emoji, label, dark }: { tint: string; emoji: string; label: string; dark?: boolean }) {
  return (
    <span className={cn('relative grid h-24 place-items-center rounded-2xl text-4xl', tint)}>
      {emoji}
      <span
        className={cn('absolute top-2 left-2 rounded-full px-2 py-0.5 text-[10px] font-black', dark ? 'bg-cocoa text-white' : 'bg-card/85')}
      >
        {label}
      </span>
    </span>
  );
}

function Friends({ friends, fallback }: { friends: ReturnType<typeof userById>[]; fallback?: string }) {
  if (!friends.length)
    return fallback ? <p className="mt-1 text-[11px] text-muted-foreground">{fallback}</p> : <span className="mt-1 h-4" />;
  return (
    <p className="mt-1 flex items-center gap-1 text-[11px] font-bold">
      <AvatarStack users={friends} size={18} /> {friends[0]!.name} is here
    </p>
  );
}
