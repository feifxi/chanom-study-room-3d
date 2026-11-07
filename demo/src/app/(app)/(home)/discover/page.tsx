'use client';

import { useState } from 'react';
import { Search, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { PublicRoomCard } from '@/components/app/PublicRoomCard';
import { DISCOVER, PUBLIC_ROOMS } from '@/lib/mock';

const TAGS = ['All', 'Study', 'Games', 'Anime', 'Language', 'Quiet'];

/** Discover: drop into a public room right now, or find a public server to join. */
export default function DiscoverPage() {
  const [tag, setTag] = useState('All');
  const servers = DISCOVER.filter((s) => tag === 'All' || s.tags.includes(tag));
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 p-5 sm:p-8">
      <header className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-mint via-sky to-lavender p-8">
        <h1 className="text-3xl font-black tracking-[-0.03em]">Find your people</h1>
        <p className="mt-1 max-w-md text-muted-foreground">Drop into a public room, or join a server that fits you.</p>
        <div className="relative mt-5 max-w-md">
          <Search className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search servers" className="h-12 rounded-2xl bg-card pl-11" />
        </div>
      </header>

      <section>
        <div className="mb-3 flex items-baseline gap-3">
          <h2 className="text-lg font-black">Public rooms</h2>
          <span className="text-sm text-muted-foreground">Anyone can drop in. Voice needs an account; guests can chat.</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PUBLIC_ROOMS.map((r) => (
            <PublicRoomCard key={r.id} room={r} />
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="mr-2 text-lg font-black">Public servers</h2>
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
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {servers.map((s) => {
            const request = s.tags.includes('Language');
            return (
              <div key={s.id} className="flex gap-4 rounded-3xl border p-4">
                <span className={cn('grid size-16 flex-none place-items-center rounded-2xl text-3xl', s.tint)}>{s.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-black">{s.name}</p>
                  <p className="text-sm text-muted-foreground">{s.blurb}</p>
                  <p className="mt-2 flex items-center gap-3 text-xs font-bold text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <span className="size-2 rounded-full bg-online" /> {s.online} online
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="size-3" /> {s.members.toLocaleString()} members
                    </span>
                  </p>
                </div>
                <Button
                  variant={request ? 'outline' : 'default'}
                  className="self-center rounded-full font-extrabold"
                  onClick={() =>
                    toast.success(request ? `Request sent to ${s.name}. The mods will let you in soon.` : `You joined ${s.name}!`)
                  }
                >
                  {request ? 'Ask to join' : 'Join'}
                </Button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
