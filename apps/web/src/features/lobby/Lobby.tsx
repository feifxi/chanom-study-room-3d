'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import {
  ACCESSORIES, HAIR_COLORS, NAME_MAX, OUTFIT_COLORS, randomLook, type Accessory, type AvatarLook, type RoomListing,
} from '@study/shared';
import { GAME_URL } from '@/lib/config';
import { loadProfile, saveProfile, type Profile } from '@/lib/profile';
import { StatsCard } from '../stats/StatsCard';

const AvatarPreview = dynamic(() => import('../avatar/AvatarPreview').then((m) => m.AvatarPreview), { ssr: false });

const ACCESSORY_LABELS: Record<Accessory, string> = {
  none: 'None', ribbon: 'Ribbon', catEars: 'Cat ears', glasses: 'Glasses', headphones: 'Headphones', ahoge: 'Ahoge', twintails: 'Twin-tails',
};

export function Lobby() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [rooms, setRooms] = useState<RoomListing[] | null>(null);
  const [offline, setOffline] = useState(false);

  useEffect(() => setProfile(loadProfile()), []);
  useEffect(() => {
    if (profile) saveProfile(profile);
  }, [profile]);

  // Poll the public room list
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

  if (!profile) return null;

  const setLook = (patch: Partial<AvatarLook>) => setProfile({ ...profile, look: { ...profile.look, ...patch } });
  const enter = (roomId?: string) => router.push(roomId ? `/room?id=${encodeURIComponent(roomId)}` : '/room');
  const online = rooms?.reduce((n, r) => n + r.clients, 0) ?? 0;

  return (
    <main className="mx-auto flex min-h-full w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:py-12">
      <header>
        <p className="text-xs font-bold tracking-[0.2em] text-accent-ink uppercase">Demo</p>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Chanom Study Room</h1>
        <p className="mt-1 text-muted">A cosy 3D study room. Come in and study together ✨</p>
      </header>

      <div className="grid gap-6 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <section className="panel flex flex-col gap-4 p-5">
          <h2 className="text-xs font-extrabold tracking-wider text-muted uppercase">Your character</h2>
          <div className="flex gap-4">
            <div className="h-56 w-44 flex-none overflow-hidden rounded-2xl bg-gradient-to-b from-[#fff6fb] to-[#e3ecfb]">
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
                  className={`rounded-full border px-3 py-1 text-xs font-bold transition ${
                    profile.look.accessory === a ? 'border-accent bg-accent text-white' : 'border-line bg-white hover:border-accent/50'
                  }`}
                >
                  {ACCESSORY_LABELS[a]}
                </button>
              ))}
            </div>
          </div>
          <button onClick={() => setProfile({ ...profile, look: randomLook() })} className="self-start rounded-xl border border-line bg-white px-3 py-1.5 text-sm font-bold hover:border-accent/50">
            🎲 Randomise
          </button>
        </section>

        <section className="panel flex flex-col gap-4 p-5">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xs font-extrabold tracking-wider text-muted uppercase">Public rooms</h2>
            <span className="text-xs text-muted">{offline ? "Can't reach the server" : `${online} online`}</span>
          </div>
          <button
            onClick={() => enter()}
            disabled={offline}
            className="rounded-2xl bg-accent px-5 py-4 text-left text-white shadow-lg shadow-accent/30 disabled:opacity-50"
          >
            <span className="block text-lg font-extrabold">Enter the library 📚</span>
            <span className="block text-sm opacity-90">We'll find you a seat. When a room is full, a new one opens automatically.</span>
          </button>
          <ul className="flex flex-col gap-2">
            {rooms?.length === 0 && <li className="py-6 text-center text-sm text-muted">Nobody's here yet. Be the first!</li>}
            {rooms?.map((r) => {
              const full = r.clients >= r.maxClients;
              return (
                <li key={r.roomId} className="flex items-center gap-3 rounded-xl border border-line bg-white px-3 py-2.5">
                  <span className="text-xl">📖</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">{r.label}</p>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-soft">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${(r.clients / r.maxClients) * 100}%` }} />
                    </div>
                  </div>
                  <span className="font-mono text-xs text-muted">{r.clients}/{r.maxClients}</span>
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

        <StatsCard visitorId={profile.visitorId} name={profile.name || 'Guest'} />
      </div>
    </main>
  );
}

function Swatches({ label, colors, value, onPick }: { label: string; colors: readonly string[]; value: string; onPick: (c: string) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-bold text-muted">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {colors.map((c) => (
          <button
            key={c}
            aria-label={c}
            onClick={() => onPick(c)}
            className={`size-6 rounded-full border-2 border-white shadow-[0_0_0_1px_var(--line)] transition-transform hover:scale-115 ${value === c ? 'shadow-[0_0_0_2px_var(--accent)]' : ''}`}
            style={{ background: c }}
          />
        ))}
      </div>
    </div>
  );
}
