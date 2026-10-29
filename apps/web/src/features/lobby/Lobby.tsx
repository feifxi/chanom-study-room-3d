'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { ArrowRight, Dices } from 'lucide-react';
import {
  ACCESSORIES,
  HAIR_COLORS,
  NAME_MAX,
  OUTFIT_COLORS,
  randomLook,
  type Accessory,
  type AvatarLook,
  type RoomListing,
} from '@study/shared';
import { LiveDot, LogoMark } from '@/components/Logo';
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

/** Room rows cycle through these pastel icon tiles. */
const ROOM_TINTS = ['bg-lavender', 'bg-peach', 'bg-mint'];

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

/** One screen: dress up your character on the left, pick a room on the right, your stats below. */
export function Lobby() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile>(loadProfile);
  const { rooms, offline } = useRooms();

  useEffect(() => saveProfile(profile), [profile]);

  const setLook = (patch: Partial<AvatarLook>) => setProfile({ ...profile, look: { ...profile.look, ...patch } });
  const enter = (roomId?: string) => router.push(roomId ? `/room?id=${encodeURIComponent(roomId)}` : '/room');
  const online = rooms?.reduce((n, r) => n + r.clients, 0) ?? 0;

  return (
    <main className="mx-auto flex min-h-full w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:py-12">
      <header className="flex items-center gap-4">
        <LogoMark size={44} />
        <div>
          <h1 className="text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl">Chanom Study Room</h1>
          <p className="mt-1 text-muted">A cosy 3D study room. Come in and study together ✨</p>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <section className="panel flex flex-col gap-4 p-5">
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
            <div className="h-56 w-44 flex-none overflow-hidden rounded-2xl bg-gradient-to-b from-lavender to-peach">
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

        <section className="panel flex flex-col gap-4 p-5">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-extrabold">Public rooms</h2>
            <span className="flex items-center gap-1.5 text-xs text-muted">
              {offline ? (
                "Can't reach the server"
              ) : (
                <>
                  <LiveDot /> {online} online
                </>
              )}
            </span>
          </div>
          <button
            onClick={() => enter()}
            disabled={offline}
            className="flex items-center gap-3 rounded-2xl bg-accent px-5 py-4 text-left text-white disabled:opacity-50"
          >
            <span className="flex-1">
              <span className="block text-lg font-extrabold">Enter the library 📚</span>
              <span className="block text-sm opacity-90">
                We&apos;ll find you a seat. When a room is full, a new one opens automatically.
              </span>
            </span>
            <ArrowRight className="size-5 flex-none" />
          </button>
          <ul className="flex flex-col gap-2">
            {rooms?.length === 0 && <li className="py-6 text-center text-sm text-muted">Nobody&apos;s here yet. Be the first!</li>}
            {rooms?.map((r, i) => {
              const full = r.clients >= r.maxClients;
              return (
                <li key={r.roomId} className="flex items-center gap-3 rounded-xl border border-line bg-white px-3 py-2.5">
                  <span className={`grid size-9 flex-none place-items-center rounded-lg text-lg ${ROOM_TINTS[i % ROOM_TINTS.length]}`}>
                    📖
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">{r.label}</p>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-soft">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${(r.clients / r.maxClients) * 100}%` }} />
                    </div>
                  </div>
                  <span className="font-mono text-xs text-muted">
                    {r.clients}/{r.maxClients}
                  </span>
                  <button
                    onClick={() => enter(r.roomId)}
                    disabled={full}
                    className="rounded-lg border border-line bg-white px-3 py-1 text-xs font-bold disabled:opacity-40"
                  >
                    {full ? 'Full' : 'Join'}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <div className="md:col-span-2">
          <StatsCard visitorId={profile.visitorId} name={profile.name || 'Guest'} />
        </div>
      </div>
    </main>
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
