'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { OpenRoomCard } from '@/components/app/OpenRoomCard';
import { COMMON_ROOMS, OPEN_ROOMS, userById } from '@/lib/mock';

const TAGS = ['All', 'Study', 'Chill', 'Games', 'Language exchange', 'Music', 'Art', 'Anime', 'Late night'];
const LANGUAGES = ['Any language', 'Thai', 'English', 'Japanese', 'Korean', 'Chinese', 'Mixed'];

/**
 * Discover: every room anyone can walk into. Common rooms are Connecta's own (text only, anyone
 * welcome, copies open as they fill); open rooms are made by people (owner, members, saved chat,
 * voice). Home shows a few under "Open now"; this is the full list.
 *
 * Open rooms are ordered by friends inside, then most people inside now, then newest; empty ones sink.
 */
export default function DiscoverPage() {
  const [tag, setTag] = useState('All');
  const [lang, setLang] = useState('Any language');
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const open = OPEN_ROOMS.filter(
    (r) =>
      (tag === 'All' || r.tags.includes(tag)) &&
      (lang === 'Any language' || r.language === lang) &&
      (!q || r.name.toLowerCase().includes(q)),
  ).sort((a, b) => (b.friendsInside?.length ?? 0) - (a.friendsInside?.length ?? 0) || b.inside - a.inside);
  const pick = [...OPEN_ROOMS].sort((a, b) => (b.friendsInside?.length ?? 0) - (a.friendsInside?.length ?? 0) || b.inside - a.inside)[0];
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 p-5 sm:p-8">
      <header className="relative grid items-center gap-6 overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-mint via-sky to-lavender p-6 sm:p-10 md:grid-cols-[1fr_20rem]">
        <span className="pointer-events-none absolute top-6 right-[36%] text-6xl opacity-25">🌏</span>
        <div>
          <p className="flex items-center gap-2 text-xs font-black tracking-wider uppercase">
            <span className="size-2 animate-pulse rounded-full bg-online" /> 1,284 online · 213 rooms open
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-[-0.03em] sm:text-5xl">Find your people</h1>
          <p className="mt-2 max-w-md">Walk into one of Connecta’s Common rooms, or an open room made by people like you.</p>
          <div className="relative mt-5 max-w-md">
            <Search className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search open rooms"
              className="h-12 rounded-2xl bg-card pl-11 shadow-sm"
            />
          </div>
        </div>
        {/* Tonight's pick: the open room with friends in it, else the busiest */}
        {pick && (
          <div className="flex flex-col gap-3 rounded-[2rem] bg-card/85 p-5 shadow-lg backdrop-blur">
            <p className="text-xs font-black tracking-wider text-primary uppercase">✨ Tonight’s pick</p>
            <div className="flex items-center gap-3">
              <span className={cn('grid size-14 flex-none place-items-center rounded-2xl text-3xl', pick.tint)}>{pick.emoji}</span>
              <span className="min-w-0">
                <span className="block truncate text-lg font-black">{pick.name}</span>
                <span className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                  <span className="size-2 rounded-full bg-online" /> {pick.inside} inside · {pick.language}
                </span>
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{pick.blurb}</p>
            {pick.friendsInside?.length ? (
              <p className="text-xs font-bold">{pick.friendsInside.map((id) => userById(id).name).join(', ')} is here 👋</p>
            ) : null}
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
          <h2 className="text-2xl font-black tracking-[-0.02em]">🚪 Open rooms</h2>
          <span className="text-sm text-muted-foreground">made by people · voice on · run by their owners and mods</span>
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
        {!open.length && <p className="py-6 text-center text-sm text-muted-foreground">No open rooms match.</p>}
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
