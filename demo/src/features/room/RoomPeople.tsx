'use client';

import { useState, type ReactNode } from 'react';
import { HeadphoneOff, LocateFixed, MicOff, Search, X } from 'lucide-react';
import { UserAvatar } from '@/components/UserAvatar';
import { cn } from '@/lib/utils';
import { PersonMenu, RoleChip } from './PersonMenu';
import { useDismiss } from './useDismiss';

/** Team: a Connecta team account in a Common room, where nobody else has powers. */
export type RoomRole = 'Owner' | 'Mod' | 'Team';

export interface RoomPerson {
  id: string;
  name: string;
  color: string;
  status: string;
  guest?: boolean;
  you?: boolean;
  role?: RoomRole;
  /** Someone on your friends list. */
  friend?: boolean;
  micOn?: boolean;
  speaking?: boolean;
  /** Can't hear the room (headphones off). */
  deafened?: boolean;
}

type Filter = 'all' | 'talking' | 'focusing' | 'friends' | 'guests';

const FILTERS: [Filter, string, (p: RoomPerson) => boolean][] = [
  ['all', 'All', () => true],
  ['talking', 'Mic on', (p) => !!p.speaking || (!!p.micOn && !p.deafened)],
  ['focusing', 'Focusing', (p) => p.status.startsWith('📖')],
  ['friends', 'Friends', (p) => !!p.friend],
  ['guests', 'Guests', (p) => !!p.guest],
];

/**
 * Who's in the room, opened from the pill of faces top right (or the phone sheet). One roomy panel
 * that still works with 100 people:
 * - search and quick filters (mic on, focusing, friends, guests)
 * - the list is grouped: you, friends, everyone else (A–Z), guests
 * Tap someone and an arrow in the room points the way to them; their "…" has everything else
 * (see PersonMenu), including the owner's and mods' tools.
 */
type PeopleProps = {
  people: RoomPerson[];
  roomName: string;
  findId: string | null;
  onFind: (id: string | null) => void;
  /** Your role in this room; owners and mods can moderate from the list. */
  myRole?: RoomRole;
  onMessage: (p: RoomPerson) => void;
};

/** Top right in the room: a pill of faces and the count that opens the people panel below it. */
export function PeoplePill(props: PeopleProps) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss<HTMLDivElement>(open, () => setOpen(false));
  const { people } = props;
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className={cn('panel flex h-[58px] items-center gap-2 px-3', open && 'bg-secondary')}
        aria-label={`In this room · ${people.length}`}
      >
        <span className="flex -space-x-2">
          {/* Talking faces first, so the pill shows who you're hearing */}
          {[...people]
            .sort((a, b) => Number(!!b.speaking) - Number(!!a.speaking))
            .slice(0, 4)
            .map((p) => (
              <UserAvatar
                key={p.id}
                user={{ name: p.name, color: p.color, presence: 'online' }}
                size={28}
                ring={p.speaking ? 'speaking' : undefined}
              />
            ))}
        </span>
        <span className="text-sm font-black">{people.length}</span>
      </button>
      {open && (
        <div className="absolute top-full right-0 z-20 mt-2">
          <RoomPeople {...props} onClose={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}

export function RoomPeople({
  people: all,
  roomName,
  findId,
  onFind,
  myRole,
  onMessage,
  onClose,
  className,
}: PeopleProps & { onClose?: () => void; className?: string }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  // Kicked or banned from the list (demo: the server would drop them from the room)
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const people = all.filter((p) => !removed.has(p.id));
  const test = FILTERS.find((f) => f[0] === filter)![2];
  const q = query.trim().toLowerCase();
  const shown = people.filter((p) => test(p) && (!q || p.name.toLowerCase().includes(q)));
  const groups: [string, RoomPerson[]][] = [
    ['You', shown.filter((p) => p.you)],
    ['Friends', shown.filter((p) => p.friend && !p.you)],
    ['Everyone else', shown.filter((p) => !p.you && !p.friend && !p.guest).sort((a, b) => a.name.localeCompare(b.name))],
    ['Guests', shown.filter((p) => p.guest && !p.you)],
  ];

  return (
    <section
      className={cn('panel flex max-h-[min(640px,calc(100dvh-100px))] bg-card w-[360px] max-w-full flex-col overflow-hidden', className)}
      aria-label="In this room"
    >
      <header className="flex items-center gap-2 px-4 pt-3.5 pb-2">
        <h2 className="min-w-0 flex-1 truncate text-base font-black">In {roomName}</h2>
        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-black text-secondary-foreground">{people.length}</span>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        )}
      </header>

      <div className="flex flex-col gap-2 px-3 pb-2">
        <label className="flex items-center gap-2 rounded-xl bg-muted px-3 focus-within:ring-2 focus-within:ring-primary/40">
          <Search className="size-4 flex-none text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find someone"
            className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none"
            aria-label="Find someone"
          />
        </label>
        <div className="flex gap-1 overflow-x-auto [scrollbar-width:none]">
          {FILTERS.map(([id, label, f]) => {
            const n = people.filter(f).length;
            if (id !== 'all' && !n) return null;
            return (
              <button
                key={id}
                onClick={() => setFilter(id)}
                aria-pressed={filter === id}
                className={cn(
                  'flex flex-none items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold',
                  filter === id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground',
                )}
              >
                {label} <span className="opacity-70">{n}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {groups.map(
          ([title, list]) =>
            list.length > 0 && (
              <div key={title} className="mb-1">
                {/* Sticky headers keep you oriented while scrolling through a crowd */}
                <p className="sticky top-0 z-10 bg-card px-2 pt-2 pb-1 text-[11px] font-black tracking-wider text-muted-foreground uppercase">
                  {title} · {list.length}
                </p>
                {list.map((p) => (
                  <Row
                    key={p.id}
                    p={p}
                    finding={findId === p.id}
                    onFind={() => onFind(findId === p.id ? null : p.id)}
                    menu={
                      !p.you && (
                        <PersonMenu
                          p={p}
                          myRole={myRole}
                          onFind={() => onFind(p.id)}
                          onMessage={() => onMessage(p)}
                          onRemove={() => setRemoved((r) => new Set(r).add(p.id))}
                        />
                      )
                    }
                  />
                ))}
              </div>
            ),
        )}
        {!shown.length && <p className="px-3 py-6 text-center text-sm text-muted-foreground">Nobody here by that name.</p>}
      </div>
    </section>
  );
}

function Row({ p, finding, onFind, menu }: { p: RoomPerson; finding: boolean; onFind: () => void; menu: ReactNode }) {
  return (
    // The row finds them; the "…" beside it opens everything else
    <div className={cn('group flex items-center gap-1 rounded-2xl pr-1.5', finding ? 'bg-secondary' : 'hover:bg-muted')}>
      <button
        onClick={onFind}
        disabled={p.you}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-2 py-1.5 text-left"
        aria-label={p.you ? undefined : `Find ${p.name}`}
      >
        <span className="relative flex-none">
          <UserAvatar user={{ name: p.name, color: p.color, presence: 'online' }} size={38} ring={p.speaking ? 'speaking' : undefined} />
          <VoiceBadge p={p} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-sm font-extrabold">
            <span className="truncate">{p.name}</span>
            {p.you && <span className="flex-none text-xs font-bold text-muted-foreground">(you)</span>}
            {p.role && <RoleChip role={p.role} />}
            {p.guest && <span className="flex-none rounded-full bg-peach px-1.5 text-[10px] font-black text-peach-ink">guest</span>}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {p.status}
            {p.deafened && ' · deafened'}
          </span>
        </span>
        {finding && (
          <span className="flex flex-none items-center gap-1 rounded-full bg-primary px-2 py-1 text-[11px] font-extrabold text-primary-foreground">
            <LocateFixed className="size-3.5" /> Showing
          </span>
        )}
      </button>
      {menu}
    </div>
  );
}

/** Small corner badge on a face: deafened beats muted; nothing when the mic is just on. */
function VoiceBadge({ p }: { p: RoomPerson }) {
  if (!p.deafened && p.micOn) return null;
  const Icon = p.deafened ? HeadphoneOff : MicOff;
  return (
    <span
      className={cn(
        'absolute -right-1 -bottom-1 grid size-[18px] place-items-center rounded-full border-2 border-card',
        p.deafened ? 'bg-destructive text-white' : 'bg-muted text-muted-foreground',
      )}
    >
      <Icon className="size-2.5" />
    </span>
  );
}
