'use client';

import { useDeferredValue, useState } from 'react';
import { Search } from 'lucide-react';
import { ROOM_LANGUAGES, ROOM_TAGS } from '@connecta/shared';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { OpenRoomCard } from '@/components/app/OpenRoomCard';
import { mapFor } from '@/features/place/model';
import { useListedRooms } from '@/features/rooms/useRooms';
import { COMMON_ROOMS } from '@/lib/mock';

const TAGS = ['All', ...ROOM_TAGS];
const LANGUAGES = ['Any language', ...ROOM_LANGUAGES];

/**
 * Discover: every room anyone can walk into. Common rooms are Connecta's own (text only, anyone
 * welcome, copies open as they fill); open rooms are made by people (owner, members, saved chat,
 * voice). Home shows a few under "Open now"; this is the full list.
 *
 * Listed rooms (Open and Ask to join) come from the API, biggest first; once presence is in (build
 * step 3) they're ordered by friends inside, then most people inside now. Common rooms are still
 * mock (feature 14).
 */
export default function DiscoverPage() {
  const [tag, setTag] = useState('All');
  const [lang, setLang] = useState('Any language');
  const [query, setQuery] = useState('');
  const q = useDeferredValue(query.trim());
  const listed = useListedRooms({
    q: q || undefined,
    tag: tag === 'All' ? undefined : tag,
    language: lang === 'Any language' ? undefined : lang,
  });
  const all = useListedRooms();
  const open = listed.data ?? [];
  // Tonight's pick: the biggest listed room you're not in yet
  const pick = all.data?.find((r) => !r.me.role);
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 p-5 sm:p-8">
      <header className="relative grid items-center gap-6 overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-mint via-sky to-lavender p-6 sm:p-10 md:grid-cols-[1fr_20rem]">
        <span className="pointer-events-none absolute top-6 right-[36%] hidden text-6xl opacity-25 md:block">🌏</span>
        <div>
          <p className="flex items-center gap-2 text-xs font-black tracking-wider uppercase">
            <span className="size-2 animate-pulse rounded-full bg-online" />{' '}
            {all.data ? `${all.data.length} ${all.data.length === 1 ? 'room' : 'rooms'} listed` : 'Rooms'}
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-[-0.03em] sm:text-5xl">Find your people</h1>
          <p className="mt-2 max-w-md">Walk into one of Connecta’s Common rooms, or an open room made by people like you.</p>
          <div className="relative mt-5 max-w-md">
            <Search className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search rooms"
              className="h-12 rounded-2xl bg-card pl-11 shadow-sm"
            />
          </div>
        </div>
        {/* Tonight's pick: the open room with friends in it, else the busiest */}
        {pick && (
          <div className="flex flex-col gap-3 rounded-[2rem] bg-card/85 p-5 shadow-lg backdrop-blur">
            <p className="text-xs font-black tracking-wider text-primary uppercase">✨ Tonight’s pick</p>
            <div className="flex items-center gap-3">
              <span className={cn('grid size-14 flex-none place-items-center rounded-2xl text-3xl', mapFor(pick.mapId).tint)}>
                {pick.emoji}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-lg font-black">{pick.name}</span>
                <span className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                  {pick.memberCount} {pick.memberCount === 1 ? 'member' : 'members'}
                  {pick.language && ` · ${pick.language}`}
                </span>
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{pick.description || mapFor(pick.mapId).blurb}</p>
          </div>
        )}
      </header>

      <section>
        <div className="mb-3 flex flex-wrap items-baseline gap-x-3">
          <h2 className="text-2xl font-black tracking-[-0.02em]">🏛️ Common rooms</h2>
          <span className="text-sm text-muted-foreground">run by Connecta · anyone welcome · text only, so it’s comfy with strangers</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {COMMON_ROOMS.map((r) => (
            <OpenRoomCard key={r.id} kind="common" room={r} />
          ))}
        </div>
      </section>

      <section>
        <div className="mb-2 flex flex-wrap items-baseline gap-x-3">
          <h2 className="text-2xl font-black tracking-[-0.02em]">🚪 Rooms by people</h2>
          <span className="text-sm text-muted-foreground">open or ask to join · voice on · run by their owners and mods</span>
        </div>
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          {TAGS.map((t) => (
            <Chip key={t} on={tag === t} onClick={() => setTag(t)}>
              {t}
            </Chip>
          ))}
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            aria-label="Language"
            className="rounded-full border bg-card px-3 py-1 text-sm font-bold"
          >
            {LANGUAGES.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {open.map((r) => (
            <OpenRoomCard key={r.id} kind="open" room={r} />
          ))}
        </div>
        {listed.isSuccess && !open.length && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {all.data?.length ? 'No rooms match.' : 'No listed rooms yet. Set yours to Open or Ask to join and it shows up here.'}
          </p>
        )}
      </section>
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn('rounded-full px-3 py-1 text-sm font-bold', on ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-secondary')}
    >
      {children}
    </button>
  );
}
