'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Bell, ChevronDown, Compass, Crown, MessageCircle, Pin, Play, Plus, Search, UserCheck } from 'lucide-react';
import { MAP_IDS, ROOM_NAME_MAX, type MapId } from '@connecta/shared';
import { toast } from 'sonner';
import { OpenRoomCard } from '@/components/app/OpenRoomCard';
import { PersonFace, personAvatar } from '@/components/PersonFace';
import { useFriends } from '@/features/friends/useFriends';
import { AvatarStack } from '@/components/UserAvatar';
import { useWatchInside } from '@/features/presence/usePresence';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMe } from '@/features/account/useMe';
import { notifyWhenSpace, ROOMS_KEY, roomsApi, useListedRooms, useMyRooms, useRoomAction } from '@/features/rooms/useRooms';
import { api } from '@/lib/api/client';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { ago, COMMON_ROOMS, MAPS } from '@/lib/mock';
import { chatHref, placeRoom, walkInHref, type PlaceRoom } from './model';
import { SizePicker, TemplateCard } from './MapPickers';
import { PlusEndingBanner } from './PlusEndingBanner';
import { RoomMenu } from './RoomMenu';
import { Scene } from './Scene';

/** How many rooms get a big card; the rest are compact rows. */
const CARDS = 6;
/** Rows shown before "Show all", so 100 rooms never become one endless page. */
const ROWS = 8;
/** Rooms nobody's opened in this many days fold away under "Quiet for a while". */
const QUIET_DAYS = 30;

type Filter = 'all' | 'mine' | 'active';

/**
 * Home: your rooms (the ones you own and the ones you're a member of), each a window into its map
 * with who's inside. Pinned rooms come first, then wherever something is happening, then the rest
 * by when you were last there. Clicking a room opens its page (the chat outside 3D, with its info);
 * "Walk in" enters 3D. The "…" has everything else, including Settings for owners and mods.
 * Below them, a few listed rooms worth dropping into; Discover has the full list.
 *
 * "Friends out right now" is friends in rooms you can walk into (feature 5's presence).
 */
export function PlaceHome() {
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [allRows, setAllRows] = useState(false);
  const [showQuiet, setShowQuiet] = useState(false);
  const [order, setOrder] = useState<'recent' | 'az'>('recent');
  const { data: me } = useMe();
  const mine = useMyRooms();
  const listed = useListedRooms();
  const pin = useRoomAction(roomsApi.myPlace);
  const client = useQueryClient();

  const rooms = (mine.data ?? []).map(placeRoom);
  useWatchInside(rooms.map((r) => r.id));
  const unread = (r: PlaceRoom) => r.room.me.unread;
  const busy = (r: PlaceRoom) => r.inside > 0;
  const pinned = (r: PlaceRoom) => r.room.me.pinned;
  const idleDays = (r: PlaceRoom) => (r.room.me.visitedAt ? daysSince(r.room.me.visitedAt) : 0);
  const sorted = [...rooms].sort(
    (a, b) =>
      Number(pinned(b)) - Number(pinned(a)) || Number(busy(b)) - Number(busy(a)) || b.inside - a.inside || idleDays(a) - idleDays(b),
  );
  const q = query.trim().toLowerCase();
  const shown = sorted.filter(
    (r) => (!q || r.name.toLowerCase().includes(q)) && (filter === 'all' || (filter === 'mine' ? r.canEdit : busy(r))),
  );
  const cards = shown.slice(0, CARDS);
  // Past the cards: recent rooms as rows (a few, then "Show all"), and rooms quiet for a month folded away.
  // Searching or filtering shows every match instead.
  const searching = !!q || filter !== 'all';
  const rest = shown.slice(CARDS).sort((a, b) => (order === 'az' ? a.name.localeCompare(b.name) : idleDays(a) - idleDays(b)));
  const quiet = searching ? [] : rest.filter((r) => idleDays(r) > QUIET_DAYS);
  const recent = searching ? rest : rest.filter((r) => idleDays(r) <= QUIET_DAYS);
  const recentShown = searching || allRows ? recent : recent.slice(0, ROWS);
  const menu = (r: PlaceRoom, className: string) => (
    <RoomMenu
      room={r}
      pinned={pinned(r)}
      onPin={() => pin.mutate({ id: r.id, pinned: !pinned(r) })}
      unread={unread(r)}
      onRead={() => void markAllRead(r.id).then(() => client.invalidateQueries({ queryKey: ROOMS_KEY }))}
      className={className}
    />
  );

  // Listed rooms you're not in yet; then two of Connecta's Common rooms
  const open = (listed.data ?? []).filter((r) => !r.me.role).slice(0, 2);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 p-5 sm:p-8">
      <header>
        <p className="text-sm font-bold text-muted-foreground">{partOfWeek()}</p>
        <h1 className="text-3xl font-black tracking-[-0.03em]">Where to tonight{me ? `, ${me.name}` : ''}?</h1>
      </header>
      <PlusEndingBanner />
      <FriendsOut />

      <section>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-black">
            Your rooms <span className="text-sm font-semibold text-muted-foreground">· {rooms.length}</span>
          </h2>
          <div className="flex gap-1">
            {(
              [
                ['all', 'All'],
                ['mine', 'You run'],
                ['active', 'Active'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setFilter(id)}
                aria-pressed={filter === id}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-bold',
                  filter === id ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:text-foreground',
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="ml-auto flex h-9 w-full items-center gap-2 rounded-full border bg-card px-3 sm:w-56">
            <Search className="size-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a room"
              aria-label="Find a room"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </label>
          <Button onClick={() => setCreating(true)} className="rounded-full font-extrabold">
            <Plus /> Make a room
          </Button>
        </div>

        {mine.isPending ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="min-h-64 animate-pulse rounded-[2rem] bg-muted" />
            ))}
          </div>
        ) : rooms.length === 0 ? (
          <FirstRoom onMake={() => setCreating(true)} />
        ) : cards.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {cards.map((r) => (
              <RoomCard
                key={r.id}
                room={r}
                pinned={pinned(r)}
                unread={unread(r)}
                menu={menu(r, 'bg-black/35 text-white backdrop-blur hover:bg-black/55')}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-3xl border border-dashed p-8 text-center text-sm text-muted-foreground">No rooms match.</p>
        )}

        {recent.length > 0 && (
          <div className="mt-4 overflow-hidden rounded-3xl border bg-card">
            <div className="flex items-center gap-2 border-b px-4 py-2">
              <p className="flex-1 text-[11px] font-black tracking-wider text-muted-foreground uppercase">
                {searching ? `Matches · ${recent.length}` : `More rooms · ${recent.length}`}
              </p>
              {(
                [
                  ['recent', 'Recent'],
                  ['az', 'A–Z'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setOrder(id)}
                  aria-pressed={order === id}
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[11px] font-bold',
                    order === id ? 'bg-muted text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            {recentShown.map((r) => (
              <RoomRow
                key={r.id}
                room={r}
                unread={unread(r)}
                menu={menu(r, 'text-muted-foreground hover:bg-muted hover:text-foreground')}
              />
            ))}
            {recent.length > recentShown.length && (
              <button onClick={() => setAllRows(true)} className="w-full py-2.5 text-sm font-extrabold text-primary hover:bg-muted/50">
                Show all {recent.length}
              </button>
            )}
          </div>
        )}

        {quiet.length > 0 && (
          <div className="mt-3 overflow-hidden rounded-3xl border border-dashed">
            <button
              onClick={() => setShowQuiet(!showQuiet)}
              aria-expanded={showQuiet}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left hover:bg-muted/50"
            >
              <span className="flex-1">
                <span className="block text-sm font-extrabold">Quiet for a while · {quiet.length}</span>
                <span className="block text-xs text-muted-foreground">
                  Rooms you haven’t opened in over a month. Leave the ones you don’t need; you can join up to 100 (200 with Plus).
                </span>
              </span>
              <ChevronDown className={cn('size-4 text-muted-foreground transition-transform', showQuiet && 'rotate-180')} />
            </button>
            {showQuiet &&
              quiet.map((r) => (
                <RoomRow
                  key={r.id}
                  room={r}
                  unread={unread(r)}
                  menu={menu(r, 'text-muted-foreground hover:bg-muted hover:text-foreground')}
                />
              ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-baseline gap-2">
          <h2 className="text-lg font-black">Open now</h2>
          <span className="text-sm text-muted-foreground">rooms anyone can walk into</span>
          <Link href="/discover" className="ml-auto flex items-center gap-1 text-sm font-extrabold text-primary hover:underline">
            See all in Discover <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {open.map((r) => (
            <OpenRoomCard key={r.id} kind="open" room={r} />
          ))}
          {COMMON_ROOMS.slice(0, 2).map((r) => (
            <OpenRoomCard key={r.id} kind="common" room={r} />
          ))}
        </div>
      </section>
      <CreateRoomDialog open={creating} onOpenChange={setCreating} />
    </div>
  );
}

/** One chip per friend in a room you can walk into (yours, or an Open one); the rest are on Friends. */
function FriendsOut() {
  const friends = useFriends();
  const out = (friends.data ?? []).filter((f) => f.presence.room && (f.presence.room.member || f.presence.room.open));
  if (!out.length) return null;
  return (
    <section>
      <h2 className="mb-3 text-lg font-black">Friends out right now</h2>
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        {out.map(({ person, presence }) => {
          const room = presence.room!;
          return (
            <Link
              key={person.id}
              // Your room: straight in. An Open one: its page, to join first
              href={room.member ? `/r/${room.id}/walk` : `/r/${room.id}`}
              className="group flex flex-none items-center gap-2.5 rounded-full border bg-card py-1.5 pr-4 pl-1.5 shadow-sm hover:border-primary/50"
            >
              <PersonFace who={person} size={34} status={presence.status} />
              <span className="text-sm">
                <span className="block font-black">{person.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {room.emoji} {room.name} · <span className="font-bold text-primary group-hover:underline">Join</span>
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function RoomCard({ room, pinned, unread, menu }: { room: PlaceRoom; pinned: boolean; unread: number; menu: React.ReactNode }) {
  const inside = room.people.map(personAvatar);

  return (
    <article className="group relative isolate flex min-h-64 flex-col overflow-hidden rounded-[2rem] text-white shadow-soft">
      <Scene
        roomId={room.id}
        mapId={room.map.id}
        className="transition-transform duration-700 group-hover:scale-105"
        emojiClass="top-6 bottom-auto text-6xl"
      />
      <div
        className={cn('absolute inset-0 -z-10 bg-gradient-to-t from-black/80 via-black/25 to-black/10', !room.inside && 'bg-black/45')}
      />
      {/* The whole card opens the room's page; the buttons on top do their own thing */}
      <Link href={chatHref(room)} className="absolute inset-0" aria-label={`Open ${room.name}`} />
      <div className="pointer-events-none relative flex flex-wrap items-start gap-1.5 p-4 pr-14">
        {pinned && (
          <Chip>
            <Pin className="size-3" />
          </Chip>
        )}
        <Chip className={room.full ? 'bg-peach text-peach-ink' : undefined}>
          {room.inside > 0 && !room.full && <span className="size-2 animate-pulse rounded-full bg-online" />}
          <span className="font-mono">
            {room.inside}/{room.capacity}
          </span>
          {room.full ? 'full' : room.inside ? 'inside' : '· lights off'}
        </Chip>
        {unread > 0 && (
          <Chip>
            <MessageCircle className="size-3" /> {room.room.me.mentioned ? '@ you · ' : ''}
            {unread} new
          </Chip>
        )}
        {/* Owners and mods of an Ask-to-join room see who's waiting (approve in Room settings → Members) */}
        {room.canEdit && room.visibility === 'request' && room.room.requestCount > 0 && (
          <Chip className="bg-lavender text-lavender-ink">
            <UserCheck className="size-3" /> {room.room.requestCount} asking to join
          </Chip>
        )}
        {room.ownerPlus && (
          <Chip>
            <Crown className="size-3" /> Plus
          </Chip>
        )}
      </div>
      <span className="absolute top-4 right-4">{menu}</span>
      <div className="pointer-events-none relative mt-auto flex flex-col gap-3 p-4">
        <div>
          <p className="flex items-center gap-2 text-2xl font-black tracking-[-0.02em]">
            <span className={cn('grid size-9 place-items-center rounded-xl text-lg', room.tint)}>{room.emoji}</span>
            {room.name}
            {room.canEdit && (
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-extrabold tracking-normal backdrop-blur">
                {room.myRole}
              </span>
            )}
          </p>
          <p className="mt-1 line-clamp-1 text-xs text-white/80">
            {room.map.emoji} {room.map.name} · {room.description || room.map.mood}
          </p>
        </div>
        <div className="pointer-events-auto flex items-center gap-2">
          {room.full ? (
            // Full is full: the chat still works, and you can ask to be told when a spot opens
            <Button
              onClick={() => notifyWhenSpace(room.id, room.name)}
              className="rounded-full bg-white/90 font-extrabold text-[#45323d] hover:bg-white"
            >
              <Bell /> Full · notify me
            </Button>
          ) : (
            <Button asChild className="rounded-full bg-white font-extrabold text-[#45323d] hover:bg-primary hover:text-primary-foreground">
              <Link href={walkInHref(room)}>
                <Play className="fill-current" /> Walk in
              </Link>
            </Button>
          )}
          <Button
            asChild
            variant="ghost"
            className="rounded-full bg-white/15 font-extrabold text-white backdrop-blur hover:bg-white/25 hover:text-white"
          >
            <Link href={chatHref(room)}>
              <MessageCircle /> Chat
            </Link>
          </Button>
          {inside.length > 0 && (
            <span className="ml-auto">
              <AvatarStack users={inside} size={28} />
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

/** A room past the first few: one line with the same facts as a card, and the same "…". */
function RoomRow({ room, unread, menu }: { room: PlaceRoom; unread: number; menu: React.ReactNode }) {
  return (
    <div className="group relative flex items-center gap-3 border-b px-3 py-2 last:border-b-0 hover:bg-muted/50">
      <Link href={chatHref(room)} className="absolute inset-0" aria-label={`Open ${room.name}`} />
      <span className={cn('grid size-10 flex-none place-items-center rounded-xl text-lg', room.tint)}>{room.emoji}</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 font-extrabold">
          <span className="truncate">{room.name}</span>
          {room.canEdit && (
            <span className="flex-none rounded-full bg-lavender px-1.5 text-[10px] font-black text-lavender-ink">{room.myRole}</span>
          )}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {room.map.emoji} {room.map.name} ·{' '}
          {room.room.me.visitedAt
            ? `you were here ${ago(Math.floor(daysSince(room.room.me.visitedAt)))}`
            : room.description || room.map.mood}
        </span>
      </span>
      <span className="hidden items-center gap-1.5 text-xs font-bold text-muted-foreground sm:flex">
        <span className={cn('size-2 rounded-full', room.inside ? 'bg-online' : 'bg-muted-foreground/40')} />
        <span className="font-mono">
          {room.inside}/{room.capacity}
        </span>
      </span>
      {unread > 0 && (
        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-black text-primary-foreground">
          {unread}
        </span>
      )}
      <Button asChild size="sm" variant="secondary" className="relative rounded-full font-extrabold">
        <Link href={walkInHref(room)}>
          <Play className="fill-current" /> Walk in
        </Link>
      </Button>
      <span className="relative">{menu}</span>
    </div>
  );
}

function Chip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn('flex items-center gap-1.5 rounded-full bg-black/35 px-2.5 py-1 text-[11px] font-extrabold backdrop-blur', className)}
    >
      {children}
    </span>
  );
}

/** Shown until you're in a room: make one, or find one. */
function FirstRoom({ onMake }: { onMake: () => void }) {
  return (
    <div className="relative isolate overflow-hidden rounded-[2rem] bg-gradient-to-br from-peach via-secondary to-lavender p-8 sm:p-10">
      <span className="pointer-events-none absolute -right-4 -bottom-6 -z-10 text-[9rem] opacity-30">🏠</span>
      <p className="text-xs font-black tracking-wider text-primary uppercase">Your rooms</p>
      <h3 className="mt-1 max-w-md text-3xl font-black tracking-[-0.03em] text-balance">Make a room for your people</h3>
      <p className="mt-2 max-w-md text-sm">
        Pick a map, name it and send the link. Your friends walk in, sit down and talk; the room and its chat are always there.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button onClick={onMake} className="rounded-full font-extrabold">
          <Plus /> Make a room
        </Button>
        <Button asChild variant="outline" className="rounded-full bg-card font-extrabold">
          <Link href="/discover">
            <Compass /> Find one in Discover
          </Link>
        </Button>
      </div>
    </div>
  );
}

/** Making a room: a name and a template (Cosy size). Everything else has a sensible default and lives in settings. */
function CreateRoomDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter();
  const [mapId, setMapId] = useState<MapId>(MAP_IDS[0]);
  const [name, setName] = useState('');
  const make = useRoomAction(roomsApi.make, (room) => {
    onOpenChange(false);
    setName('');
    toast.success('Room made! Invite your friends 💌');
    router.push(`/r/${room.id}`);
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] max-w-[calc(100%-2rem)] overflow-y-auto rounded-3xl sm:max-w-2xl">
        <DialogTitle className="text-xl font-black">Make a room</DialogTitle>
        <DialogDescription>Pick a template and name it. It’s private until you invite people; up to 25 at once for free.</DialogDescription>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) make.mutate({ name: name.trim(), mapId });
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-room">Room name</Label>
            <Input
              id="new-room"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={ROOM_NAME_MAX}
              placeholder="e.g. Chanom Friends"
              className="rounded-xl"
              autoFocus
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {MAPS.map((m) => (
              <TemplateCard key={m.id} map={m} picked={mapId === m.id} onPick={() => setMapId(m.id as MapId)} />
            ))}
          </div>
          <SizePicker size="cosy" plus={false} onPick={() => {}} />
          <p className="-mt-2 text-xs text-muted-foreground">
            Every template has the same things to do; only the place differs. Colours, the sign, time of day and a thumbnail are in the
            room’s settings once it’s made.
          </p>
          <Button type="submit" disabled={!name.trim() || make.isPending} className="w-fit rounded-full font-extrabold">
            Make room
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const DAY_MS = 24 * 60 * 60 * 1000;
const daysSince = (iso: string) => (Date.now() - Date.parse(iso)) / DAY_MS;

/** "Saturday evening 🌙": the greeting's mood line, from your own clock. */
function partOfWeek(d = new Date()) {
  const day = d.toLocaleDateString('en-US', { weekday: 'long' });
  const h = d.getHours();
  const part = h < 5 ? 'night 🌌' : h < 12 ? 'morning ☀️' : h < 17 ? 'afternoon 🍵' : h < 21 ? 'evening 🌙' : 'night 🌌';
  return `${day} ${part}`;
}

/** "Mark as read" in a room's "…": read up to its latest message. */
async function markAllRead(roomId: string) {
  const { data } = await api.GET('/api/rooms/{id}/messages', { params: { path: { id: roomId }, query: { limit: 1 } } });
  const latest = data?.messages[0];
  if (latest) await api.PUT('/api/rooms/{id}/read', { params: { path: { id: roomId } }, body: { messageId: latest.id } });
}
