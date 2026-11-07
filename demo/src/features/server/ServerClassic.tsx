import Link from 'next/link';
import { ArrowRight, CalendarHeart, Hash, Users, VolumeX } from 'lucide-react';
import { MembersPanel } from '@/components/server/MembersPanel';
import { AvatarStack } from '@/components/UserAvatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MAPS, channelMessages, userById, type Server } from '@/lib/mock';

/** Server home, Classic design: banner, the rooms as big doors you can walk through, recent chat, event. */
export function ServerClassic({ server }: { server: Server }) {
  const general = server.channels[0]!;
  const recent = channelMessages(server.id, general.id).slice(-3);

  return (
    <>
      <div className="min-w-0 flex-1 overflow-y-auto">
        <div className={cn('relative h-40 bg-gradient-to-br dark:opacity-80', server.banner)}>
          <div className="absolute -bottom-10 left-6 flex items-end gap-4">
            <span
              className={cn('grid size-24 place-items-center rounded-[1.75rem] border-[6px] border-card text-5xl shadow-soft', server.tint)}
            >
              {server.emoji}
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-8 p-6 pt-14">
          <header>
            <h1 className="text-3xl font-black tracking-[-0.03em]">{server.name}</h1>
            <p className="mt-1 text-muted-foreground">{server.description}</p>
          </header>

          <section>
            <h2 className="mb-3 text-lg font-black">Rooms</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {server.rooms.map((r) => {
                const map = MAPS.find((m) => m.id === r.mapId)!;
                const people = r.people.map(userById);
                return (
                  <Link
                    key={r.id}
                    href={`/servers/${server.id}/rooms/${r.id}`}
                    className="group overflow-hidden rounded-3xl border bg-background/60 transition-shadow hover:shadow-soft"
                  >
                    <div className={cn('relative grid h-36 place-items-center text-6xl', map.tint)}>
                      <span className="transition-transform group-hover:-translate-y-1 group-hover:scale-105">{map.emoji}</span>
                      {people.length > 0 && (
                        <span className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-card/90 px-2.5 py-1 text-xs font-bold">
                          <span className="size-2 rounded-full bg-online" /> {people.length} here
                        </span>
                      )}
                      <span className="absolute top-3 right-3 flex gap-1">
                        {r.quiet && (
                          <span className="flex items-center gap-1 rounded-full bg-card/90 px-2 py-1 text-[11px] font-bold">
                            <VolumeX className="size-3" /> Quiet
                          </span>
                        )}
                        {r.allowGuests && (
                          <span className="flex items-center gap-1 rounded-full bg-card/90 px-2 py-1 text-[11px] font-bold">
                            <Users className="size-3" /> Guests OK
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 p-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-lg font-black">{r.name}</p>
                        <p className="truncate text-sm text-muted-foreground">
                          {map.name} · {r.happening ?? 'Nobody yet, be the first'}
                        </p>
                      </div>
                      {people.length > 0 && <AvatarStack users={people} size={28} />}
                    </div>
                    <div className="flex items-center justify-between border-t px-4 py-2.5 text-sm">
                      <span className="font-mono text-xs text-muted-foreground">
                        {people.length}/{r.capacity}
                      </span>
                      <span className="flex items-center gap-1 font-extrabold text-primary">
                        Walk in <ArrowRight className="size-4" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <section className="rounded-3xl border p-4">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="flex items-center gap-1.5 font-black">
                  <Hash className="size-4" /> {general.name}
                </h2>
                <Button asChild size="sm" variant="ghost" className="rounded-full font-bold">
                  <Link href={`/servers/${server.id}/chat/${general.id}`}>Open chat</Link>
                </Button>
              </div>
              {recent.map((m) => (
                <p key={m.id} className="truncate py-1 text-sm">
                  <span className="font-extrabold">{userById(m.author).name}</span> <span className="text-muted-foreground">{m.text}</span>
                </p>
              ))}
            </section>
            {server.event && (
              <section className="rounded-3xl bg-lavender p-4 text-lavender-ink">
                <h2 className="flex items-center gap-1.5 font-black">
                  <CalendarHeart className="size-4" /> {server.event}
                </h2>
                <p className="mt-1 text-sm">In the Rooftop room. 6 people are going.</p>
                <Button size="sm" className="mt-3 rounded-full font-extrabold">
                  I’m going
                </Button>
              </section>
            )}
          </div>
        </div>
      </div>
      <MembersPanel server={server} />
    </>
  );
}
