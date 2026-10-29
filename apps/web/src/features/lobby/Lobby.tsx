'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { ArrowRight, Armchair, Cat, Dices, LayoutGrid, Timer, Users } from 'lucide-react';
import {
  ACCESSORIES,
  HAIR_COLORS,
  MAX_PLAYERS,
  NAME_MAX,
  OUTFIT_COLORS,
  randomLook,
  type Accessory,
  type AvatarLook,
  type RoomListing,
} from '@study/shared';
import { LiveDot, Logo } from '@/components/Logo';
import { GAME_URL } from '@/lib/config';
import { loadProfile, saveProfile, type Profile } from '@/lib/profile';
import { StatsCard } from '../stats/StatsCard';

const AvatarPreview = dynamic(() => import('../avatar/AvatarPreview').then((m) => m.AvatarPreview), { ssr: false });

const ACCESSORY_LABELS: Record<Accessory, string> = {
  none: 'None',
  ribbon: 'Ribbon',
  catEars: 'Cat ears',
  glasses: 'Glasses',
  headphones: 'Headphones',
  ahoge: 'Ahoge',
  twintails: 'Twin-tails',
};

/** Room cards cycle through these pastel headers. */
const CARD_THEMES = [
  { bg: 'bg-lavender', ink: 'text-lavender-ink', ring: 'bg-[#dcd3fa]', emoji: '📚', tagline: 'Quiet focus, good company.' },
  { bg: 'bg-peach', ink: 'text-peach-ink', ring: 'bg-[#fbd9c6]', emoji: '☕', tagline: 'Tea, lamps and deadlines.' },
  { bg: 'bg-mint', ink: 'text-mint-ink', ring: 'bg-[#c9ebd8]', emoji: '🐈', tagline: 'Cats nap, you study.' },
];

const FEATURES = [
  {
    icon: Users,
    tint: 'bg-lavender text-lavender-ink',
    title: 'Study side by side.',
    body: 'Walk in, pick a desk and see who else is focusing. Talk when you’re close.',
  },
  {
    icon: Timer,
    tint: 'bg-peach text-peach-ink',
    title: 'Focus out loud.',
    body: 'Start a pomodoro and your minutes show above your head. Share your screen with your table.',
  },
  {
    icon: Cat,
    tint: 'bg-mint text-mint-ink',
    title: 'Cosy company.',
    body: 'Summon a library cat or a study buddy from the machine by the wall.',
  },
];

/** Poll the public room list every few seconds. */
function useRooms() {
  const [rooms, setRooms] = useState<RoomListing[] | null>(null);
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch(`${GAME_URL}/rooms`, { cache: 'no-store' });
        const list = (await res.json()) as RoomListing[];
        if (alive) {
          setRooms(list);
          setOffline(false);
        }
      } catch {
        if (alive) setOffline(true);
      }
    };
    load();
    const timer = setInterval(load, 5000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);
  return { rooms, offline };
}

export function Lobby() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile>(loadProfile);
  const { rooms, offline } = useRooms();

  useEffect(() => saveProfile(profile), [profile]);

  const setLook = (patch: Partial<AvatarLook>) => setProfile({ ...profile, look: { ...profile.look, ...patch } });
  const enter = (roomId?: string) => router.push(roomId ? `/room?id=${encodeURIComponent(roomId)}` : '/room');
  const online = rooms?.reduce((n, r) => n + r.clients, 0) ?? 0;
  const busiest = rooms?.slice().sort((a, b) => b.clients - a.clients)[0];

  return (
    <div className="min-h-full">
      <nav className="mx-auto flex max-w-6xl items-center gap-8 px-5 py-5">
        <Logo />
        <div className="hidden gap-6 text-sm font-semibold text-muted sm:flex">
          <a href="#rooms" className="hover:text-ink">
            Rooms
          </a>
          <a href="#stats" className="hover:text-ink">
            My stats
          </a>
        </div>
        <button
          onClick={() => enter()}
          disabled={offline}
          className="ml-auto rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          Enter the library
        </button>
      </nav>

      <main className="mx-auto flex max-w-6xl flex-col gap-16 px-5 pt-6 pb-20">
        {/* Hero */}
        <section className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="flex flex-col items-start gap-6">
            <span className="flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-bold">
              <LiveDot />
              {offline ? 'Library is offline right now' : `${online} ${online === 1 ? 'person' : 'people'} studying right now`}
            </span>
            <h1 className="display text-5xl text-ink sm:text-7xl">
              Study together,
              <br />
              from anywhere.
            </h1>
            <p className="max-w-md text-lg leading-relaxed text-muted">
              A cosy 3D library. Walk in as your character, take a desk and focus alongside everyone else, with a cat napping on the sofa.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => enter()}
                disabled={offline}
                className="flex items-center gap-2 rounded-xl bg-accent px-5 py-3.5 font-bold text-white disabled:opacity-50"
              >
                <ArrowRight className="size-4" /> Enter the library
              </button>
              <a
                href="#character"
                className="flex items-center gap-2 rounded-xl border border-line bg-white px-5 py-3.5 font-bold text-ink"
              >
                Dress up first
              </a>
            </div>
            <p className="flex items-center gap-2 text-sm text-muted">
              <span className="flex -space-x-1.5">
                {HAIR_COLORS.slice(0, 4).map((c) => (
                  <span key={c} className="size-6 rounded-full border-2 border-white" style={{ background: c }} />
                ))}
              </span>
              Free, no sign-up. Up to {MAX_PLAYERS} people per room.
            </p>
          </div>

          {/* Character studio */}
          <div id="character" className="relative">
            <section className="panel flex flex-col gap-4 rounded-[28px] p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-extrabold">Your character</h2>
                <button
                  onClick={() => setProfile({ ...profile, look: randomLook() })}
                  className="flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1 text-xs font-bold"
                >
                  <Dices className="size-3.5" /> Shuffle
                </button>
              </div>
              <div className="flex gap-4">
                <div className="h-60 w-44 flex-none overflow-hidden rounded-2xl bg-gradient-to-b from-lavender to-peach">
                  <AvatarPreview look={profile.look} />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-3">
                  <label className="flex flex-col gap-1 text-xs font-bold text-muted">
                    Nickname
                    <input
                      value={profile.name}
                      maxLength={NAME_MAX}
                      placeholder="Guest"
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      className="rounded-xl border border-line bg-white px-3 py-2 text-sm font-semibold text-ink outline-none focus:border-accent"
                    />
                  </label>
                  <Swatches label="Hair" colors={HAIR_COLORS} value={profile.look.hair} onPick={(hair) => setLook({ hair })} />
                  <Swatches label="Outfit" colors={OUTFIT_COLORS} value={profile.look.outfit} onPick={(outfit) => setLook({ outfit })} />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-muted">Accessory</span>
                <div className="flex flex-wrap gap-1.5">
                  {ACCESSORIES.map((a) => (
                    <button
                      key={a}
                      onClick={() => setLook({ accessory: a })}
                      className={`rounded-full border px-3 py-1 text-xs font-bold ${
                        profile.look.accessory === a ? 'border-accent bg-accent-soft text-accent-ink' : 'border-line bg-white'
                      }`}
                    >
                      {ACCESSORY_LABELS[a]}
                    </button>
                  ))}
                </div>
              </div>
            </section>
            {busiest && busiest.clients > 0 && (
              <div className="panel absolute -bottom-8 -left-4 hidden w-60 flex-col gap-2 p-4 sm:flex">
                <div className="flex items-center justify-between">
                  <span className="rounded-md bg-accent-soft px-2 py-0.5 text-xs font-bold text-accent-ink">{busiest.label}</span>
                  <span className="flex items-center gap-1 text-xs font-bold text-peach-ink">
                    <LiveDot /> Live
                  </span>
                </div>
                <p className="text-sm font-bold">
                  {busiest.clients} {busiest.clients === 1 ? 'person' : 'people'} studying
                </p>
              </div>
            )}
          </div>
        </section>

        {/* What it's like */}
        <section className="grid gap-6 border-y border-line py-8 md:grid-cols-3 md:gap-0 md:divide-x md:divide-line">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex gap-4 md:px-6 md:first:pl-0 md:last:pr-0">
              <span className={`grid size-11 flex-none place-items-center rounded-xl ${f.tint}`}>
                <f.icon className="size-5" />
              </span>
              <div>
                <h3 className="font-bold">{f.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">{f.body}</p>
              </div>
            </div>
          ))}
        </section>

        {/* Rooms */}
        <section id="rooms" className="flex flex-col gap-6">
          <div>
            <h2 className="display text-4xl">Happening in the library</h2>
            <p className="mt-2 text-muted">Every room is public. When one fills up, a new one opens by itself.</p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {rooms?.map((r, i) => (
              <RoomCard key={r.roomId} room={r} theme={CARD_THEMES[i % CARD_THEMES.length]!} onJoin={() => enter(r.roomId)} />
            ))}
            {rooms?.length === 0 && <EmptyRoomCard theme={CARD_THEMES[0]!} onEnter={() => enter()} />}
            {!rooms && !offline && [0, 1, 2].map((i) => <div key={i} className="panel h-72 animate-pulse" />)}
            {offline && <p className="text-sm text-muted md:col-span-3">Can&apos;t reach the game server. Is it running?</p>}
          </div>
          <div className="flex flex-col items-start gap-4 rounded-[22px] bg-lavender px-6 py-5 sm:flex-row sm:items-center">
            <div className="flex-1">
              <p className="font-bold">Your desk is waiting.</p>
              <p className="text-sm text-muted">
                We&apos;ll seat you in the first room with space, so you&apos;re never studying alone for long.
              </p>
            </div>
            <button
              onClick={() => enter()}
              disabled={offline}
              className="flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-bold disabled:opacity-50"
            >
              <Armchair className="size-4" /> Find me a seat
            </button>
          </div>
        </section>

        <div id="stats">
          <StatsCard visitorId={profile.visitorId} name={profile.name || 'Guest'} />
        </div>
      </main>
    </div>
  );
}

type CardTheme = (typeof CARD_THEMES)[number];

function RoomCard({ room, theme, onJoin }: { room: RoomListing; theme: CardTheme; onJoin: () => void }) {
  const full = room.clients >= room.maxClients;
  return (
    <article className="panel flex flex-col overflow-hidden">
      <CardHeader theme={theme} title={room.label} live />
      <div className="flex flex-1 flex-col gap-1 px-5 pt-4 pb-5">
        <p className="text-sm text-muted">Open all day</p>
        <h3 className="text-lg font-bold">{room.label}</h3>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-soft">
          <div className="h-full rounded-full bg-accent" style={{ width: `${(room.clients / room.maxClients) * 100}%` }} />
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-line pt-4 text-sm">
          <span className="flex items-center gap-2 text-muted">
            <LayoutGrid className="size-4" /> {room.clients} / {room.maxClients} studying
          </span>
          <button
            onClick={onJoin}
            disabled={full}
            className="flex items-center gap-1 font-bold text-accent hover:text-accent-ink disabled:text-muted"
          >
            {full ? 'Full' : 'Join'} {!full && <ArrowRight className="size-4" />}
          </button>
        </div>
      </div>
    </article>
  );
}

function EmptyRoomCard({ theme, onEnter }: { theme: CardTheme; onEnter: () => void }) {
  return (
    <article className="panel flex flex-col overflow-hidden">
      <CardHeader theme={theme} title="Library #1" />
      <div className="flex flex-1 flex-col gap-1 px-5 pt-4 pb-5">
        <p className="text-sm text-muted">Nobody&apos;s here yet</p>
        <h3 className="text-lg font-bold">Be the first to open the library</h3>
        <div className="mt-auto flex justify-end border-t border-line pt-4">
          <button onClick={onEnter} className="flex items-center gap-1 text-sm font-bold text-accent hover:text-accent-ink">
            Open it <ArrowRight className="size-4" />
          </button>
        </div>
      </div>
    </article>
  );
}

function CardHeader({ theme, title, live = false }: { theme: CardTheme; title: string; live?: boolean }) {
  return (
    <div className={`relative h-40 overflow-hidden ${theme.bg}`}>
      <span
        className={`absolute top-4 left-4 flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-bold ${live ? 'text-peach-ink' : 'text-muted'}`}
      >
        {live ? (
          <>
            <LiveDot /> Live now
          </>
        ) : (
          'Open'
        )}
      </span>
      <p className={`absolute bottom-5 left-5 max-w-[52%] text-xl leading-tight font-extrabold tracking-[-0.03em] ${theme.ink}`}>
        {theme.tagline}
      </p>
      <span
        className={`absolute -right-8 -bottom-10 grid size-40 place-items-center rounded-full border-[10px] border-white ${theme.ring}`}
      >
        <span className="text-5xl" aria-hidden="true">
          {theme.emoji}
        </span>
      </span>
      <span className="sr-only">{title}</span>
    </div>
  );
}

function Swatches({
  label,
  colors,
  value,
  onPick,
}: {
  label: string;
  colors: readonly string[];
  value: string;
  onPick: (c: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-bold text-muted">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {colors.map((c) => (
          <button
            key={c}
            aria-label={`${label} ${c}`}
            aria-pressed={value === c}
            onClick={() => onPick(c)}
            className={`size-6 rounded-full border-2 border-white shadow-[0_0_0_1px_var(--line)] transition-transform hover:scale-110 ${value === c ? 'shadow-[0_0_0_2px_var(--accent)]' : ''}`}
            style={{ background: c }}
          />
        ))}
      </div>
    </div>
  );
}
