'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, Play } from 'lucide-react';
import { PublicRoomCard } from '@/components/app/PublicRoomCard';
import { AvatarStack, UserAvatar } from '@/components/UserAvatar';
import { cn } from '@/lib/utils';
import { DMS, MAPS, PUBLIC_ROOMS, SERVERS, USERS, userById } from '@/lib/mock';

/**
 * Home, Live design: like opening a streaming app. One big "jump back in" (the busiest room your
 * friends are in, shown as the real scene), then rows you scroll sideways: friends, rooms, public
 * rooms, servers. Built for "I just want to go hang out", fewest choices first.
 */
export function HomeLive() {
  const live = SERVERS.flatMap((s) => s.rooms.filter((r) => r.people.length).map((r) => ({ s, r }))).sort(
    (a, b) => b.r.people.length - a.r.people.length,
  );
  const hero = live[0]!;
  const heroPeople = hero.r.people.map(userById);
  const friends = Object.values(USERS).filter((u) => u.presence !== 'offline');

  return (
    <div className="flex flex-col gap-8 p-5 sm:p-8">
      {/* The one thing to do right now */}
      <Link
        href={`/servers/${hero.s.id}/rooms/${hero.r.id}`}
        className="group relative isolate flex min-h-72 overflow-hidden rounded-[2rem] shadow-soft"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- a demo still, not worth next/image config */}
        <img
          src="/screenshot.png"
          alt=""
          className="absolute inset-0 -z-10 size-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/75 via-black/40 to-transparent" />
        <div className="flex max-w-lg flex-col justify-end gap-3 p-7 text-white">
          <span className="flex w-fit items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-extrabold backdrop-blur">
            <span className="size-2 animate-pulse rounded-full bg-online" /> Live now · {hero.s.emoji} {hero.s.name}
          </span>
          <h1 className="text-4xl font-black tracking-[-0.03em]">
            {heroPeople
              .slice(0, 2)
              .map((u) => u.name)
              .join(' and ')}
            {heroPeople.length > 2 && ` +${heroPeople.length - 2}`} are in the {hero.r.name}
          </h1>
          <p className="text-white/80">{hero.r.happening ?? 'Hanging out'} · grab a seat next to them</p>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 font-extrabold text-primary-foreground group-hover:bg-primary-ink">
              <Play className="size-4 fill-current" /> Walk in
            </span>
            <AvatarStack users={heroPeople} size={32} />
          </div>
        </div>
      </Link>

      <Row title="Friends right now" hint={`${friends.length} online`}>
        {friends.map((u) => {
          const where = u.inRoom && SERVERS.find((s) => s.id === u.inRoom!.serverId)?.rooms.find((r) => r.id === u.inRoom!.roomId);
          return (
            <div
              key={u.id}
              className="flex w-44 flex-none snap-start flex-col items-center gap-2 rounded-3xl border bg-background/60 p-4 text-center"
            >
              <UserAvatar user={u} size={56} presence />
              <div className="min-w-0">
                <p className="font-black">{u.name}</p>
                <p className="line-clamp-2 text-xs text-muted-foreground">{u.activity ?? 'Online'}</p>
              </div>
              {where ? (
                <Link
                  href={`/servers/${u.inRoom!.serverId}/rooms/${u.inRoom!.roomId}`}
                  className="mt-auto rounded-full bg-secondary px-3 py-1 text-xs font-extrabold text-secondary-foreground hover:bg-primary hover:text-primary-foreground"
                >
                  Join in {where.name}
                </Link>
              ) : (
                <Link
                  href={DMS.some((d) => d.with === u.id) ? `/home/messages/${DMS.find((d) => d.with === u.id)!.id}` : '/home/friends'}
                  className="mt-auto rounded-full border px-3 py-1 text-xs font-extrabold hover:bg-muted"
                >
                  Say hi
                </Link>
              )}
            </div>
          );
        })}
      </Row>

      <Row title="Rooms with friends" hint="tap to walk in">
        {live.map(({ s, r }) => {
          const map = MAPS.find((m) => m.id === r.mapId)!;
          return (
            <Link
              key={`${s.id}/${r.id}`}
              href={`/servers/${s.id}/rooms/${r.id}`}
              className="group w-64 flex-none snap-start overflow-hidden rounded-3xl border bg-background/60 hover:shadow-soft"
            >
              <div className={cn('relative grid h-32 place-items-center text-5xl', map.tint)}>
                <span className="transition-transform group-hover:scale-110">{map.emoji}</span>
                <span className="absolute top-2 left-2 rounded-full bg-card/90 px-2 py-0.5 text-[11px] font-bold">
                  {s.emoji} {s.name}
                </span>
              </div>
              <div className="flex items-center gap-2 p-3">
                <div className="min-w-0 flex-1">
                  <p className="font-black">{r.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{r.happening}</p>
                </div>
                <AvatarStack users={r.people.map(userById)} />
              </div>
            </Link>
          );
        })}
      </Row>

      <Row title="Public rooms" hint="open to everyone" more="/discover">
        {PUBLIC_ROOMS.map((r) => (
          <div key={r.id} className="w-60 flex-none snap-start">
            <PublicRoomCard room={r} />
          </div>
        ))}
      </Row>

      <Row title="Your servers">
        {SERVERS.map((s) => {
          const here = s.rooms.reduce((n, r) => n + r.people.length, 0);
          return (
            <Link
              key={s.id}
              href={`/servers/${s.id}`}
              className="flex w-60 flex-none snap-start items-center gap-3 rounded-3xl border bg-background/60 p-3 hover:shadow-soft"
            >
              <span className={cn('grid size-14 flex-none place-items-center rounded-2xl text-2xl', s.tint)}>{s.emoji}</span>
              <span className="min-w-0">
                <span className="block truncate font-black">{s.name}</span>
                <span className="block text-xs text-muted-foreground">{here ? `${here} in rooms now` : `${s.memberCount} members`}</span>
              </span>
            </Link>
          );
        })}
      </Row>
    </div>
  );
}

function Row({ title, hint, more, children }: { title: string; hint?: string; more?: string; children: ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-baseline gap-3">
        <h2 className="text-lg font-black">{title}</h2>
        {hint && <span className="text-sm text-muted-foreground">{hint}</span>}
        {more && (
          <Link href={more} className="ml-auto flex items-center gap-1 text-sm font-bold text-primary hover:underline">
            See all <ArrowRight className="size-4" />
          </Link>
        )}
      </div>
      <div className="-mx-5 flex snap-x gap-3 overflow-x-auto px-5 pb-2 sm:-mx-8 sm:px-8">{children}</div>
    </section>
  );
}
