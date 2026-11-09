'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { OpenRoomCard } from '@/components/app/OpenRoomCard';
import { COMMON_ROOMS, OPEN_ROOMS } from '@/lib/mock';

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
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 p-5 sm:p-8">
      <header className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-mint via-sky to-lavender p-8">
        <h1 className="text-3xl font-black tracking-[-0.03em]">Find your people</h1>
        <p className="mt-1 max-w-md text-muted-foreground">
          Rooms anyone can walk into: Connecta’s Common rooms, or open rooms made by people like you.
        </p>
        <div className="relative mt-5 max-w-md">
          <Search className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search open rooms"
            className="h-12 rounded-2xl bg-card pl-11"
          />
        </div>
      </header>

      <section>
        <div className="mb-3 flex flex-wrap items-baseline gap-x-3">
          <h2 className="text-lg font-black">Common rooms</h2>
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
          <h2 className="text-lg font-black">Open rooms</h2>
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
