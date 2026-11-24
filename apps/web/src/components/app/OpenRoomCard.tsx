'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Users, VolumeX } from 'lucide-react';
import { JoinRoomDialog } from '@/features/place/JoinRoomDialog';
import { chatHref, mapFor } from '@/features/place/model';
import type { ListedRoom } from '@/features/rooms/useRooms';
import { AvatarStack } from '@/components/UserAvatar';
import { cn } from '@/lib/utils';
import { personAvatar } from '@/components/PersonFace';
import type { CommonRoom } from '@/features/common/useCommon';
import { MAPS } from '@/lib/maps';
import { useIsGuest } from '@/features/account/useMe';
import { SIGN_UP_HREF } from '@/features/account/links';

type Props = { kind: 'open'; room: ListedRoom } | { kind: 'common'; room: CommonRoom };

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
  if (props.kind === 'common') {
    const d = props.room;
    const map = MAPS.find((m) => m.id === d.mapId)!;
    const friends = d.friendsInside.map(personAvatar);
    return (
      // Walk in picks the copy: a friend's, else the busiest with space
      <Link href={`/common/${d.id}`} className={CARD}>
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

/**
 * A listed room (Open or Ask to join) opens its preview (rules, who runs it) before you join; one
 * you're already in opens its page.
 */
function OpenCard({ room: o }: { room: ListedRoom }) {
  const [preview, setPreview] = useState(false);
  const map = mapFor(o.mapId);
  const { inside } = o;
  const fill = inside / o.capacity;
  const full = inside >= o.capacity;
  const mine = !!o.me.role;
  // Guests can look, but listed rooms have members, and members need an account
  const guest = useIsGuest();
  const action = guest
    ? 'Sign up to join'
    : mine
      ? 'Open'
      : o.me.requested
        ? 'Waiting to be let in'
        : o.visibility === 'request'
          ? 'Ask to join'
          : full
            ? 'Join · full now'
            : 'Join & walk in';
  const body = (
    <>
      <Picture tint={map.tint} emoji={o.emoji} thumbnail={o.thumbnail} label={o.visibility === 'request' ? 'Ask to join' : 'Open room'} />
      <p className="mt-2 truncate font-black">{o.name}</p>
      <p className="line-clamp-1 text-xs text-muted-foreground">
        {o.description || map.mood} · by {o.owner.name}
      </p>
      <p className="mt-1 truncate text-[11px] font-bold text-muted-foreground">
        {[o.language, ...o.tags].filter(Boolean).join(' · ') || `${map.emoji} ${map.name}`}
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full', fill > 0.85 ? 'bg-tea' : 'bg-primary')}
          style={{ width: `${Math.min(1, fill) * 100}%` }}
        />
      </div>
      <p className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
        <span className="font-mono">
          {inside}/{o.capacity}
          {full && ' full'}
        </span>
        <span className="flex items-center gap-0.5">
          <Users className="size-3" /> {o.memberCount.toLocaleString()} {o.memberCount === 1 ? 'member' : 'members'}
        </span>
      </p>
      <span className="mt-1 h-4" />
      <span
        className={cn(
          BUTTON,
          full || o.me.requested ? 'bg-muted text-muted-foreground' : 'bg-primary text-primary-foreground group-hover:bg-primary-ink',
        )}
      >
        {action}
      </span>
    </>
  );
  if (guest)
    return (
      <Link href={SIGN_UP_HREF} className={CARD}>
        {body}
      </Link>
    );
  // Already a member: go to the room's page (its chat works even when the room is full)
  return mine ? (
    <Link href={chatHref(o)} className={CARD}>
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

function Picture({
  tint,
  emoji,
  thumbnail,
  label,
  dark,
}: {
  tint: string;
  emoji: string;
  /** The owner's own picture, over the map's colours */
  thumbnail?: string | null;
  label: string;
  dark?: boolean;
}) {
  return (
    <span className={cn('relative grid h-24 place-items-center overflow-hidden rounded-2xl text-4xl', tint)}>
      {thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element -- a short-lived storage link
        <img src={thumbnail} alt="" className="absolute inset-0 size-full object-cover" />
      ) : (
        emoji
      )}
      <span
        className={cn('absolute top-2 left-2 rounded-full px-2 py-0.5 text-[10px] font-black', dark ? 'bg-cocoa text-white' : 'bg-card/85')}
      >
        {label}
      </span>
    </span>
  );
}

function Friends({ friends, fallback }: { friends: Parameters<typeof AvatarStack>[0]['users']; fallback?: string }) {
  if (!friends.length)
    return fallback ? <p className="mt-1 text-[11px] text-muted-foreground">{fallback}</p> : <span className="mt-1 h-4" />;
  return (
    <p className="mt-1 flex items-center gap-1 text-[11px] font-bold">
      <AvatarStack users={friends} size={18} /> {friends[0]!.name} is here
    </p>
  );
}
