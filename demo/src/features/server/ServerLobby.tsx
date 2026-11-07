'use client';

import Link from 'next/link';
import { CalendarHeart, Hash, Play, UserPlus, Users, VolumeX } from 'lucide-react';
import { toast } from 'sonner';
import { AvatarStack, UserAvatar } from '@/components/UserAvatar';
import { cn } from '@/lib/utils';
import { MAPS, channelMessages, userById, type Server } from '@/lib/mock';

/** A soft scene gradient per template, for rooms without a real screenshot yet. */
const SCENE: Record<string, string> = {
  cafe: 'from-[#f6c9a0] via-[#e9a77c] to-[#7a4a3a]',
  rooftop: 'from-[#2a2f5b] via-[#4b3f78] to-[#e7a0b8]',
  lounge: 'from-[#c9e6d3] via-[#8fc4b0] to-[#3d6b63]',
};

/**
 * Server home, Lobby design: the server feels like a building and each room is a big window into it,
 * showing the real scene and who's inside. Rooms are the point, so they take the whole page; chat
 * and the event sit in a slim column on the right.
 */
export function ServerLobby({ server }: { server: Server }) {
  const general = server.channels[0];
  const inRooms = server.rooms.reduce((n, r) => n + r.people.length, 0);

  return (
    <div className="flex min-w-0 flex-1">
      <div className="min-w-0 flex-1 overflow-y-auto p-5 sm:p-6">
        <header className="mb-5 flex flex-wrap items-center gap-3">
          <span className={cn('grid size-14 place-items-center rounded-2xl text-3xl', server.tint)}>{server.emoji}</span>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-black tracking-[-0.03em]">{server.name}</h1>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <span className="size-2 rounded-full bg-online" /> {inRooms} in rooms · {server.memberCount} members
            </p>
          </div>
          <button
            onClick={() => toast.success('Invite link copied')}
            className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-extrabold text-primary-foreground hover:bg-primary-ink"
          >
            <UserPlus className="size-4" /> Invite
          </button>
        </header>

        <div className="flex flex-col gap-4">
          {server.rooms.map((r, i) => {
            const map = MAPS.find((m) => m.id === r.mapId)!;
            const people = r.people.map(userById);
            const real = r.mapId === 'library';
            return (
              <Link
                key={r.id}
                href={`/servers/${server.id}/rooms/${r.id}`}
                className={cn('group relative isolate flex overflow-hidden rounded-[2rem] shadow-soft', i === 0 ? 'min-h-64' : 'min-h-40')}
              >
                {real ? (
                  // eslint-disable-next-line @next/next/no-img-element -- a demo still
                  <img
                    src="/screenshot.png"
                    alt=""
                    className="absolute inset-0 -z-10 size-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  <div className={cn('absolute inset-0 -z-10 bg-gradient-to-br', SCENE[r.mapId] ?? SCENE.cafe)}>
                    <span className="absolute right-10 bottom-4 text-8xl opacity-80 transition-transform duration-700 group-hover:scale-110">
                      {map.emoji}
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />
                <div className="flex flex-1 flex-col justify-end gap-2 p-6 text-white">
                  <div className="flex flex-wrap gap-1.5">
                    <Tag>
                      <span className="font-mono">
                        {people.length}/{r.capacity}
                      </span>
                    </Tag>
                    {people.length > 0 && (
                      <Tag>
                        <span className="size-2 animate-pulse rounded-full bg-online" /> {people.length} inside
                      </Tag>
                    )}
                    {r.quiet && (
                      <Tag>
                        <VolumeX className="size-3" /> Quiet
                      </Tag>
                    )}
                    {r.allowGuests && (
                      <Tag>
                        <Users className="size-3" /> Guests OK
                      </Tag>
                    )}
                  </div>
                  <h2 className={cn('font-black tracking-[-0.02em]', i === 0 ? 'text-4xl' : 'text-2xl')}>{r.name}</h2>
                  <p className="text-sm text-white/80">
                    {map.name} · {r.happening ?? 'Nobody yet, be the first'}
                  </p>
                  <div className="mt-1 flex items-center gap-3">
                    <span className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-extrabold text-[#45323d] group-hover:bg-primary group-hover:text-primary-foreground">
                      <Play className="size-3.5 fill-current" /> Walk in
                    </span>
                    {people.length > 0 && <AvatarStack users={people} size={30} />}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <aside className="hidden w-72 flex-none flex-col gap-4 overflow-y-auto border-l p-4 xl:flex">
        {server.event && (
          <section className="rounded-3xl bg-lavender p-4 text-lavender-ink">
            <p className="flex items-center gap-1.5 font-black">
              <CalendarHeart className="size-4" /> {server.event}
            </p>
            <p className="mt-1 text-sm">6 people are going.</p>
          </section>
        )}
        {general && (
          <section>
            <Link href={`/servers/${server.id}/chat/${general.id}`} className="mb-2 flex items-center gap-1.5 font-black hover:underline">
              <Hash className="size-4" /> {general.name}
            </Link>
            <div className="flex flex-col gap-2">
              {channelMessages(server.id, general.id)
                .slice(-4)
                .map((m) => (
                  <div key={m.id} className="flex gap-2">
                    <UserAvatar user={userById(m.author)} size={26} />
                    <p className="min-w-0 text-sm">
                      <span className="font-extrabold">{userById(m.author).name}</span>{' '}
                      <span className="text-muted-foreground">{m.image ? '📷 a photo' : m.text}</span>
                    </p>
                  </div>
                ))}
            </div>
          </section>
        )}
      </aside>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-extrabold backdrop-blur">
      {children}
    </span>
  );
}
