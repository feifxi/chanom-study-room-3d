'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Bell, ChevronDown, MessageCircle, Pin, Play, Plus, Rocket, Search } from 'lucide-react';
import { toast } from 'sonner';
import { OpenRoomCard } from '@/components/app/OpenRoomCard';
import { AvatarStack, UserAvatar } from '@/components/UserAvatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useManyRooms } from '@/lib/demoCrowd';
import { DROP_INS, MANY_ROOMS, MAPS, ME, OPEN_ROOMS, SERVERS, USERS, serverById, userById } from '@/lib/mock';
import { chatHref, levelFor, placeRoom, walkInHref, type PlaceRoom } from './model';
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
 * Below them, a few open rooms worth dropping into right now; Discover has the full list.
 */
export function PlaceHome() {
  const [creating, setCreating] = useState(false);
  const [pinned, setPinned] = useState<Set<string>>(new Set(['chanom']));
  const [read, setRead] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [allRows, setAllRows] = useState(false);
  const [showQuiet, setShowQuiet] = useState(false);
  const [order, setOrder] = useState<'recent' | 'az'>('recent');
  const many = useManyRooms();
  const out = Object.values(USERS).filter((u) => u.inRoom);

  const rooms = (many ? [...SERVERS, ...MANY_ROOMS] : SERVERS).map(placeRoom);
  const unreadOf = (r: PlaceRoom) => (read.has(r.id) ? 0 : (r.chat?.unread ?? 0));
  const busy = (r: PlaceRoom) => r.inside > 0 || unreadOf(r) > 0;
  const sorted = [...rooms].sort(
    (a, b) => Number(pinned.has(b.id)) - Number(pinned.has(a.id)) || Number(busy(b)) - Number(busy(a)) || b.inside - a.inside,
  );
  const q = query.trim().toLowerCase();
  const shown = sorted.filter(
    (r) => (!q || r.name.toLowerCase().includes(q)) && (filter === 'all' || (filter === 'mine' ? !!r.myRole : busy(r))),
  );
  const cards = shown.slice(0, CARDS);
  // Past the cards: recent rooms as rows (a few, then "Show all"), and rooms quiet for a month folded away.
  // Searching or filtering shows every match instead.
  const searching = !!q || filter !== 'all';
  const rest = shown
    .slice(CARDS)
    .sort((a, b) => (order === 'az' ? a.name.localeCompare(b.name) : (a.server.idleDays ?? 0) - (b.server.idleDays ?? 0)));
  const quiet = searching ? [] : rest.filter((r) => (r.server.idleDays ?? 0) > QUIET_DAYS);
  const recent = searching ? rest : rest.filter((r) => (r.server.idleDays ?? 0) <= QUIET_DAYS);
  const recentShown = searching || allRows ? recent : recent.slice(0, ROWS);
  const togglePin = (id: string) =>
    setPinned((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const menu = (r: PlaceRoom, className: string) => (
    <RoomMenu
      room={r}
      pinned={pinned.has(r.id)}
      onPin={() => togglePin(r.id)}
      unread={unreadOf(r)}
      onRead={() => setRead((s) => new Set(s).add(r.id))}
      className={className}
    />
  );

  // Open rooms you're not in yet, ones with friends inside first; then two of Connecta's drop-in rooms
  const open = OPEN_ROOMS.filter((r) => !serverById(r.id))
    .sort((a, b) => (b.friendsInside?.length ?? 0) - (a.friendsInside?.length ?? 0))
    .slice(0, 2);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 p-5 sm:p-8">
      <header>
        <p className="text-sm font-bold text-muted-foreground">Saturday evening 🌙</p>
        <h1 className="text-3xl font-black tracking-[-0.03em]">Where to tonight, {ME.name}?</h1>
      </header>

      {out.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-black">Friends out right now</h2>
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
            {out.map((u) => {
              const r = placeRoom(serverById(u.inRoom!.serverId)!);
              return (
                <Link
                  key={u.id}
                  href={walkInHref(r)}
                  className="group flex flex-none items-center gap-2.5 rounded-full border bg-card py-1.5 pr-4 pl-1.5 shadow-sm hover:border-primary/50"
                >
                  <UserAvatar user={u} size={34} presence />
                  <span className="text-sm">
                    <span className="block font-black">{u.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {r.emoji} {r.name} · <span className="font-bold text-primary group-hover:underline">Join</span>
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

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

        {cards.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {cards.map((r) => (
              <RoomCard
                key={r.id}
                room={r}
                pinned={pinned.has(r.id)}
                unread={unreadOf(r)}
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
                unread={unreadOf(r)}
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
                  unread={unreadOf(r)}
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
          {DROP_INS.slice(0, 2).map((r) => (
            <OpenRoomCard key={r.id} kind="drop-in" room={r} />
          ))}
        </div>
      </section>
      <CreateRoomDialog open={creating} onOpenChange={setCreating} />
    </div>
  );
}

function RoomCard({ room, pinned, unread, menu }: { room: PlaceRoom; pinned: boolean; unread: number; menu: React.ReactNode }) {
  const inside = room.people.map(userById);
  const level = levelFor(room.boosts).level;

  return (
    <article className="group relative isolate flex min-h-64 flex-col overflow-hidden rounded-[2rem] text-white shadow-soft">
      <Scene
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
          <Chip className={room.chat?.mention ? 'bg-primary text-primary-foreground' : undefined}>
            <MessageCircle className="size-3" /> {room.chat?.mention ? '@ you · ' : ''}
            {unread} new
          </Chip>
        )}
        {level > 0 && (
          <Chip>
            <Rocket className="size-3" /> Lv {level}
          </Chip>
        )}
      </div>
      <span className="absolute top-4 right-4">{menu}</span>
      <div className="pointer-events-none relative mt-auto flex flex-col gap-3 p-4">
        <div>
          <p className="flex items-center gap-2 text-2xl font-black tracking-[-0.02em]">
            <span className={cn('grid size-9 place-items-center rounded-xl text-lg', room.tint)}>{room.emoji}</span>
            {room.name}
            {room.myRole && (
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-extrabold tracking-normal backdrop-blur">
                {room.myRole === 'Owner' ? 'owner' : 'mod'}
              </span>
            )}
          </p>
          <p className="mt-1 text-xs text-white/80">
            {room.map.emoji} {room.map.name} · {room.server.event ?? room.description}
          </p>
        </div>
        <div className="pointer-events-auto flex items-center gap-2">
          {room.full ? (
            // Full is full: the chat still works, and you can ask to be told when a spot opens
            <Button
              onClick={() => toast.success(`We’ll tell you when there’s space in ${room.name}`)}
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
          {room.myRole && (
            <span className="flex-none rounded-full bg-lavender px-1.5 text-[10px] font-black text-lavender-ink">
              {room.myRole === 'Owner' ? 'owner' : 'mod'}
            </span>
          )}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {room.map.emoji} {room.map.name} · {room.server.lastActive ? `you were here ${room.server.lastActive}` : room.description}
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

/** Making a room: a name and a map. Everything else has a sensible default and lives in settings. */
function CreateRoomDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [mapId, setMapId] = useState(MAPS[0]!.id);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] rounded-3xl sm:max-w-2xl">
        <DialogTitle className="text-xl font-black">Make a room</DialogTitle>
        <DialogDescription>Pick a map and name it. It’s private until you invite people; up to 25 at once for free.</DialogDescription>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="new-room">Room name</Label>
          <Input id="new-room" placeholder="e.g. Chanom Friends" className="rounded-xl" />
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {MAPS.map((m) => (
            <button
              key={m.id}
              onClick={() => setMapId(m.id)}
              className={cn('rounded-2xl border-2 p-2 text-left', mapId === m.id ? 'border-primary' : 'border-border')}
            >
              <span className={cn('grid h-20 place-items-center rounded-xl text-3xl', m.tint)}>{m.emoji}</span>
              <p className="mt-1.5 text-sm font-extrabold">{m.name}</p>
              <p className="text-[11px] text-muted-foreground">{m.blurb}</p>
            </button>
          ))}
        </div>
        <Button
          className="w-fit rounded-full font-extrabold"
          onClick={() => {
            onOpenChange(false);
            toast.success('Room made! Invite your friends 💌');
          }}
        >
          Make room
        </Button>
      </DialogContent>
    </Dialog>
  );
}
