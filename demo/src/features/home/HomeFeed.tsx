'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { AtSign, CalendarHeart, Camera, Flame, Footprints, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { UserAvatar } from '@/components/UserAvatar';
import { cn } from '@/lib/utils';
import { SERVERS, USERS, userById } from '@/lib/mock';

const MOODS = ['📖 Studying', '🎮 Up for games', '☕ Just chilling', '🌙 Night owl', '🔕 Busy'];

/**
 * Home, Feed design: a timeline of what your friends are doing, newest first, each with one action
 * (walk in, reply, go). Feels like a social app; good when friends are spread over many servers.
 * Who's online sits on the right, Discord-style.
 */
export function HomeFeed() {
  const [mood, setMood] = useState<string | null>(null);
  const online = Object.values(USERS).filter((u) => u.presence !== 'offline');
  const offline = Object.values(USERS).filter((u) => u.presence === 'offline');
  const chanom = SERVERS[0]!;

  return (
    <div className="mx-auto flex max-w-6xl gap-8 p-5 sm:p-8">
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <header>
          <p className="text-sm font-bold text-muted-foreground">Saturday evening 🌙</p>
          <h1 className="text-3xl font-black tracking-[-0.03em]">What’s happening</h1>
        </header>

        {/* Your own status, so the feed works both ways */}
        <div className="rounded-3xl border bg-gradient-to-br from-secondary/60 to-peach/60 p-4">
          <p className="mb-2 text-sm font-extrabold">What are you up to tonight?</p>
          <div className="flex flex-wrap gap-1.5">
            {MOODS.map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMood(mood === m ? null : m);
                  toast(mood === m ? 'Status cleared' : `Friends now see: ${m}`);
                }}
                className={cn(
                  'rounded-full border px-3 py-1 text-sm font-bold',
                  mood === m ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:bg-muted',
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <Item user="mai" icon={<Footprints />} time="32m" action={['Walk in', `/servers/chanom/rooms/library`]}>
          <b>Mai</b> started focusing on Calculus in <b>📚 Library</b> · {chanom.emoji} {chanom.name}
          <p className="mt-1 text-sm text-muted-foreground">Jod and Ploy are there too.</p>
        </Item>

        <Item user="ken" icon={<AtSign />} time="1h" action={['Reply', '/servers/chanom/chat/general']} highlight>
          <b>Ken</b> mentioned you in <b>#general</b>
          <p className="mt-1 rounded-2xl bg-card px-3 py-2 text-sm">
            <span className="rounded bg-secondary px-1 font-bold text-secondary-foreground">@feifei</span> you coming?
          </p>
        </Item>

        <Item user="ken" icon={<Footprints />} time="1h" action={['Join the game', '/servers/cpe/rooms/lounge']}>
          <b>Ken</b> is playing <b>🎴 Slave</b> at the card table in <b>☕ Lounge</b> · 📐 CPE Year 3
          <p className="mt-1 text-sm text-muted-foreground">2 seats left at the table.</p>
        </Item>

        <Item user="jod" icon={<Camera />} time="2h" action={['See in #general', '/servers/chanom/chat/general']}>
          <b>Jod</b> took a photo in the Library
          {/* eslint-disable-next-line @next/next/no-img-element -- a demo still */}
          <img
            src="/screenshot.png"
            alt="Jod's photo from the Library"
            className="mt-2 aspect-video w-full max-w-md rounded-2xl object-cover"
          />
        </Item>

        <Item emoji="🗓️" icon={<CalendarHeart />} time="Fri 20:00" action={['I’m going', null]}>
          <b>Werewolf night</b> in {chanom.emoji} {chanom.name} · Rooftop
          <p className="mt-1 text-sm text-muted-foreground">6 people are going, including Mai and Ken.</p>
        </Item>

        <Item emoji="🔥" icon={<Flame />} time="today">
          You hit a <b>5-day focus streak</b>. 7h 15m this week.
        </Item>

        <Item user="nam" icon={<UserPlus />} time="yesterday" action={['Say hi', '/home/friends']}>
          <b>Nam</b> accepted your friend request
        </Item>
      </div>

      <aside className="hidden w-64 flex-none flex-col gap-1 lg:flex">
        <p className="px-2 pb-1 text-[11px] font-black tracking-wider text-muted-foreground uppercase">Online · {online.length}</p>
        {online.map((u) => (
          <Friend key={u.id} id={u.id} />
        ))}
        <p className="mt-4 px-2 pb-1 text-[11px] font-black tracking-wider text-muted-foreground uppercase">Offline · {offline.length}</p>
        {offline.map((u) => (
          <Friend key={u.id} id={u.id} />
        ))}
      </aside>
    </div>
  );
}

function Item({
  user,
  emoji,
  icon,
  time,
  action,
  highlight,
  children,
}: {
  user?: string;
  emoji?: string;
  icon: ReactNode;
  time: string;
  action?: [string, string | null];
  highlight?: boolean;
  children: ReactNode;
}) {
  return (
    <article className={cn('flex gap-3 rounded-3xl border p-4', highlight ? 'border-primary/40 bg-secondary/40' : 'bg-background/60')}>
      <div className="relative flex-none">
        {user ? (
          <UserAvatar user={userById(user)} size={44} />
        ) : (
          <span className="grid size-11 place-items-center rounded-full bg-muted text-xl">{emoji}</span>
        )}
        <span className="absolute -right-1 -bottom-1 grid size-5 place-items-center rounded-full border-2 border-card bg-primary text-primary-foreground [&_svg]:size-2.5">
          {icon}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] leading-snug">{children}</div>
        <div className="mt-2 flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{time}</span>
          {action &&
            (action[1] ? (
              <Link
                href={action[1]}
                className="rounded-full bg-primary px-3 py-1 text-xs font-extrabold text-primary-foreground hover:bg-primary-ink"
              >
                {action[0]}
              </Link>
            ) : (
              <button
                onClick={() => toast.success('See you there!')}
                className="rounded-full bg-primary px-3 py-1 text-xs font-extrabold text-primary-foreground hover:bg-primary-ink"
              >
                {action[0]}
              </button>
            ))}
        </div>
      </div>
    </article>
  );
}

function Friend({ id }: { id: string }) {
  const u = userById(id);
  return (
    <div className={cn('flex items-center gap-2.5 rounded-xl px-2 py-1.5', u.presence === 'offline' && 'opacity-50')}>
      <UserAvatar user={u} size={32} presence />
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold">{u.name}</span>
        <span className="block truncate text-[11px] text-muted-foreground">
          {u.activity ?? (u.presence === 'offline' ? 'Offline' : 'Online')}
        </span>
      </span>
    </div>
  );
}
