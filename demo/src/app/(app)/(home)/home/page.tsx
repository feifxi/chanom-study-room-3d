import Link from 'next/link';
import { ArrowRight, CalendarHeart, Flame, Globe, Lock, MessageCircle, UserCheck } from 'lucide-react';
import { AvatarStack } from '@/components/UserAvatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PublicRoomCard } from '@/components/app/PublicRoomCard';
import { MAPS, PUBLIC_ROOMS, SERVERS, USERS, userById } from '@/lib/mock';

const VIS = { private: [Lock, 'Private'], request: [UserCheck, 'Request to join'], public: [Globe, 'Public'] } as const;
const WEEK = [35, 80, 20, 65, 110, 50, 75];

/** Home: who's hanging out right now (with one-tap join), your servers, and a little of your own stuff. */
export default function HomePage() {
  // Rooms with friends in them, busiest first
  const live = SERVERS.flatMap((s) => s.rooms.filter((r) => r.people.length).map((r) => ({ s, r }))).sort(
    (a, b) => b.r.people.length - a.r.people.length,
  );

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 p-5 sm:p-8">
      <header className="flex flex-wrap items-end gap-4">
        <div>
          <p className="text-sm font-bold text-muted-foreground">Saturday evening 🌙</p>
          <h1 className="text-3xl font-black tracking-[-0.03em]">Hi feifei, 4 friends are around</h1>
        </div>
        <Button asChild variant="secondary" className="ml-auto rounded-full font-bold">
          <Link href="/home/friends">
            <MessageCircle /> Friends
          </Link>
        </Button>
      </header>

      <section>
        <SectionTitle title="Hanging out now" hint="Tap to walk in" />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {live.map(({ s, r }) => {
            const map = MAPS.find((m) => m.id === r.mapId)!;
            const people = r.people.map(userById);
            return (
              <Link
                key={`${s.id}/${r.id}`}
                href={`/servers/${s.id}/rooms/${r.id}`}
                className="group flex items-center gap-4 rounded-3xl border bg-background/60 p-3 transition-shadow hover:shadow-soft"
              >
                <span className={cn('grid size-20 flex-none place-items-center rounded-2xl text-4xl', map.tint)}>{map.emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                    <span className="size-2 rounded-full bg-online" /> {s.emoji} {s.name}
                  </span>
                  <span className="block text-lg font-black">{r.name}</span>
                  <span className="mt-1 flex items-center gap-2">
                    <AvatarStack users={people} />
                    <span className="truncate text-sm text-muted-foreground">
                      {people.map((p) => p.name).join(', ')} · {r.happening}
                    </span>
                  </span>
                </span>
                <span className="hidden rounded-full bg-primary px-4 py-2 text-sm font-extrabold text-primary-foreground group-hover:bg-primary-ink sm:block">
                  Walk in
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Always here, so someone with no friends online yet still has somewhere to go */}
      <section>
        <div className="mb-3 flex items-baseline gap-3">
          <h2 className="text-lg font-black">Public rooms</h2>
          <span className="text-sm text-muted-foreground">
            Open to everyone · {PUBLIC_ROOMS.reduce((n, r) => n + r.people, 0)} people in now
          </span>
          <Link href="/discover" className="ml-auto flex items-center gap-1 text-sm font-bold text-primary hover:underline">
            See all <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PUBLIC_ROOMS.map((r) => (
            <PublicRoomCard key={r.id} room={r} />
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_300px]">
        <section>
          <SectionTitle title="Your servers" hint={`${SERVERS.length} servers`} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {SERVERS.map((s) => {
              const [VisIcon, visLabel] = VIS[s.visibility];
              const unread = s.channels.reduce((n, c) => n + (c.unread ?? 0), 0);
              return (
                <Link
                  key={s.id}
                  href={`/servers/${s.id}`}
                  className="overflow-hidden rounded-3xl border bg-background/60 transition-shadow hover:shadow-soft"
                >
                  <div className={cn('relative h-16 bg-gradient-to-r dark:opacity-60', s.banner)}>
                    <span
                      className={cn(
                        'absolute -bottom-6 left-4 grid size-14 place-items-center rounded-2xl border-4 border-card text-2xl',
                        s.tint,
                      )}
                    >
                      {s.emoji}
                    </span>
                  </div>
                  <div className="p-4 pt-8">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-black">{s.name}</p>
                      {!!unread && (
                        <span className="ml-auto rounded-full bg-primary px-2 text-[11px] font-black text-primary-foreground">
                          {unread} new
                        </span>
                      )}
                    </div>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <VisIcon className="size-3" /> {visLabel} · {s.memberCount} members
                    </p>
                    <div className="mt-3 flex flex-col gap-1.5">
                      {s.rooms.map((r) => (
                        <div key={r.id} className="flex items-center gap-2 rounded-xl bg-muted/60 px-2.5 py-1.5 text-sm">
                          <span>{MAPS.find((m) => m.id === r.mapId)!.emoji}</span>
                          <span className="font-bold">{r.name}</span>
                          <span className="ml-auto text-xs text-muted-foreground">
                            {r.people.length ? (
                              <span className="flex items-center gap-1.5">
                                <span className="size-1.5 rounded-full bg-online" />
                                {r.people.length} here
                              </span>
                            ) : (
                              'empty'
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <aside className="flex flex-col gap-4">
          <div className="rounded-3xl bg-gradient-to-br from-secondary to-peach p-5">
            <p className="text-sm font-bold text-muted-foreground">Your focus this week</p>
            <p className="mt-1 text-3xl font-black">7h 15m</p>
            <p className="flex items-center gap-1 text-sm font-bold text-peach-ink">
              <Flame className="size-4" /> 5-day streak
            </p>
            <div className="mt-4 flex h-16 items-end gap-1.5" aria-label="Minutes per day this week">
              {WEEK.map((m, i) => (
                <span
                  key={i}
                  className={cn('flex-1 rounded-t-md', i === 6 ? 'bg-primary' : 'bg-primary/35')}
                  style={{ height: `${(m / 110) * 100}%` }}
                />
              ))}
            </div>
            <div className="mt-1 flex justify-between text-[10px] font-bold text-muted-foreground">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <span key={i}>{d}</span>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border p-4">
            <p className="mb-3 flex items-center gap-2 font-black">
              <CalendarHeart className="size-4 text-primary" /> Coming up
            </p>
            {SERVERS.filter((s) => s.event).map((s) => (
              <div key={s.id} className="flex items-center gap-3 py-1.5">
                <span className={cn('grid size-9 place-items-center rounded-xl', s.tint)}>{s.emoji}</span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold">{s.event!.split(' · ')[0]}</span>
                  <span className="block text-xs text-muted-foreground">
                    {s.event!.split(' · ')[1]} · {s.name}
                  </span>
                </span>
              </div>
            ))}
          </div>

          <Link href="/home/shop" className="flex items-center gap-3 rounded-3xl border bg-mint/50 p-4 hover:shadow-soft">
            <span className="text-4xl">🐥</span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-bold text-mint-ink">New in the shop</span>
              <span className="block font-black">Pet Duckling</span>
              <span className="block text-xs text-muted-foreground">It follows you around the room</span>
            </span>
            <ArrowRight className="size-4" />
          </Link>

          <p className="px-1 text-xs text-muted-foreground">
            {Object.values(USERS).filter((u) => u.presence !== 'offline').length} friends online right now
          </p>
        </aside>
      </div>
    </div>
  );
}

function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-3 flex items-baseline gap-3">
      <h2 className="text-lg font-black">{title}</h2>
      {hint && <span className="text-sm text-muted-foreground">{hint}</span>}
    </div>
  );
}
