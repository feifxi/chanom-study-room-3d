'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { OpenRoomCard } from '@/components/app/OpenRoomCard';
import { DROP_INS, OPEN_ROOMS } from '@/lib/mock';

const TAGS = ['All', 'Study', 'Games', 'Anime', 'Language', 'Quiet'];

/**
 * Discover: every room anyone can walk into. Open rooms are made by people (owner, members, saved
 * chat); drop-in rooms are Connecta's own, with copies that open as they fill. Home shows a few of
 * these under "Open now"; this is the full list, with search and tags.
 */
export default function DiscoverPage() {
  const [tag, setTag] = useState('All');
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const open = OPEN_ROOMS.filter((r) => (tag === 'All' || r.tags.includes(tag)) && (!q || r.name.toLowerCase().includes(q)));
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 p-5 sm:p-8">
      <header className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-mint via-sky to-lavender p-8">
        <h1 className="text-3xl font-black tracking-[-0.03em]">Find your people</h1>
        <p className="mt-1 max-w-md text-muted-foreground">Rooms anyone can walk into: made by people like you, or run by Connecta.</p>
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
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="mr-1 text-lg font-black">Open rooms</h2>
          <span className="mr-2 text-sm text-muted-foreground">made by people · join to keep it on your Home</span>
          {TAGS.map((t) => (
            <button
              key={t}
              onClick={() => setTag(t)}
              className={cn(
                'rounded-full px-3 py-1 text-sm font-bold',
                tag === t ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-secondary',
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {open.map((r) => (
            <OpenRoomCard key={r.id} kind="open" room={r} />
          ))}
        </div>
        {!open.length && <p className="py-6 text-center text-sm text-muted-foreground">No open rooms match.</p>}
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-baseline gap-x-3">
          <h2 className="text-lg font-black">Drop-in rooms</h2>
          <span className="text-sm text-muted-foreground">
            run by Connecta · no joining, just drop in · new copies open as people come, so they’re never full
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {DROP_INS.map((r) => (
            <OpenRoomCard key={r.id} kind="drop-in" room={r} />
          ))}
        </div>
      </section>
    </div>
  );
}
