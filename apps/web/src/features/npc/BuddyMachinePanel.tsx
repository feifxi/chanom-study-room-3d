'use client';

import { useEffect, useState } from 'react';
import {
  COAT_BY_ID,
  NPC_LIMITS,
  parseJson,
  NPC_NAME_MAX,
  SPIN_COOLDOWN_MS,
  SPIN_REVEAL_MS,
  SUBJECT_MAX,
  type BuddySettings,
  type CatSettings,
  type GachaSpun,
  type NpcKind,
  type NpcView,
} from '@study/shared';
import { useNow } from '@/lib/time';
import type { StudyRoom } from '../room/roomSession';

const KINDS: { kind: NpcKind; icon: string; title: string; blurb: string }[] = [
  { kind: 'cat', icon: '🐈', title: 'Library cat', blurb: 'Wanders, naps on the sofa, loves head pats.' },
  { kind: 'buddy', icon: '🧑‍🎓', title: 'Study buddy', blurb: 'Takes a seat, runs a pomodoro and cheers you on.' },
];

interface Props {
  room: StudyRoom;
  npcIds: string[];
  spins: (GachaSpun & { at: number })[];
  error: string | null;
  onClose: () => void;
}

/** The Buddy Machine: summon room NPCs and tune the ones already here. Shared by everyone. */
export function BuddyMachinePanel({ room, npcIds, spins, error, onClose }: Props) {
  const now = useNow(250);
  const [tab, setTab] = useState<'summon' | 'residents'>('summon');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const npcs = room.state.npcs;
  const entries = npcIds.map((id) => [id, npcs?.get(id)] as const).filter((e): e is readonly [string, NpcView] => !!e[1]);
  const count = (kind?: NpcKind) => entries.filter(([, n]) => !kind || n.kind === kind).length;
  // Your latest spin drives both the cooldown and the result card. A refused spin
  // never arrives here, so it doesn't start a cooldown (the server enforces it anyway).
  const lastMine = spins.findLast((s) => s.bySessionId === room.sessionId);
  const cooldown = lastMine ? Math.max(0, SPIN_COOLDOWN_MS - (now - lastMine.at)) : 0;
  const mine = lastMine && now - lastMine.at < 20_000 ? lastMine : undefined;
  const revealed = mine && now - mine.at > SPIN_REVEAL_MS;

  const spin = (kind: NpcKind) => room.send('gacha:spin', { kind });

  return (
    // Docked on the right (between the pomodoro and voice panels) so the machine stays visible while it spins
    <section className="panel absolute top-[15.5rem] right-4 bottom-[11.5rem] z-20 flex w-[min(400px,calc(100vw-32px))] flex-col gap-3 overflow-y-auto p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-extrabold">🎰 Buddy Machine</h2>
          <p className="text-xs text-muted">Friends for the whole room. Anyone can summon or tune them.</p>
        </div>
        <button onClick={onClose} className="rounded-md border border-line bg-white px-2 py-0.5 text-xs font-bold whitespace-nowrap">
          Close (Esc)
        </button>
      </div>

      <div className="grid grid-cols-2 gap-1 rounded-xl bg-soft p-1 text-sm font-bold">
        {(['summon', 'residents'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-lg py-1 ${tab === t ? 'bg-white shadow-sm' : 'text-muted'}`}>
            {t === 'summon' ? 'Summon' : `Residents (${count()})`}
          </button>
        ))}
      </div>

      {tab === 'summon' ? (
        <div className="flex flex-col gap-2">
          {KINDS.map((k) => {
            const full = count(k.kind) >= NPC_LIMITS[k.kind] || count() >= NPC_LIMITS.total;
            return (
              <div key={k.kind} className="flex items-center gap-3 rounded-xl border border-line bg-white p-3">
                <span className="text-3xl">{k.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">
                    {k.title}{' '}
                    <span className="font-mono text-xs font-normal text-muted">
                      {count(k.kind)}/{NPC_LIMITS[k.kind]}
                    </span>
                  </p>
                  <p className="text-xs text-muted">{k.blurb}</p>
                </div>
                <button
                  onClick={() => spin(k.kind)}
                  disabled={full || cooldown > 0}
                  className="rounded-lg bg-accent px-3 py-2 text-sm font-bold whitespace-nowrap text-white disabled:opacity-40"
                >
                  {full ? 'Full' : cooldown > 0 ? `${Math.ceil(cooldown / 1000)}s` : 'Spin ✨'}
                </button>
              </div>
            );
          })}
          {error && <p className="text-xs font-bold text-accent-ink">{error}</p>}
          {mine && (
            <div className={`rounded-xl p-3 text-center ${mine.rare ? 'bg-[#fff3c4]' : 'bg-soft'}`}>
              {revealed ? (
                <>
                  <p className="text-sm font-extrabold">
                    {mine.rare ? '🌟 Rare! ' : '✨ '}You got a {mine.label}!
                  </p>
                  <RenameField
                    key={`${mine.npcId}:${npcs?.get(mine.npcId)?.name ?? mine.name}`}
                    room={room}
                    id={mine.npcId}
                    name={npcs?.get(mine.npcId)?.name ?? mine.name}
                  />
                </>
              ) : (
                <p className="animate-pulse text-sm font-bold">The capsule is rolling out… 🥚</p>
              )}
            </div>
          )}
          <p className="text-[11px] text-muted">Up to {NPC_LIMITS.total} friends per room. They go home when the room closes.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2 overflow-y-auto pr-1">
          {entries.length === 0 && <li className="py-4 text-center text-sm text-muted">No residents yet. Spin the machine!</li>}
          {entries.map(([id, n]) => (
            <Resident key={id} room={room} id={id} npc={n} />
          ))}
        </ul>
      )}
    </section>
  );
}

/** Callers key this by id + name, so a rename from anyone else resets the field. */
function RenameField({ room, id, name }: { room: StudyRoom; id: string; name: string }) {
  const [value, setValue] = useState(name);
  const save = () => {
    if (value.trim() && value.trim() !== name) room.send('npc:update', { id, name: value });
  };
  return (
    <input
      value={value}
      maxLength={NPC_NAME_MAX}
      onChange={(e) => setValue(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
      }}
      aria-label="Name"
      className="mt-1.5 w-full rounded-lg border border-line bg-white px-2.5 py-1 text-center text-sm font-bold outline-none focus:border-accent"
    />
  );
}

function Toggle({ on, labels, onChange }: { on: boolean; labels: [string, string]; onChange: (v: boolean) => void }) {
  return (
    <div className="grid grid-cols-2 gap-0.5 rounded-lg bg-soft p-0.5 text-xs font-bold">
      {[true, false].map((v) => (
        <button
          key={String(v)}
          onClick={() => onChange(v)}
          className={`rounded-md px-2 py-0.5 ${on === v ? 'bg-white shadow-sm' : 'text-muted'}`}
        >
          {labels[v ? 0 : 1]}
        </button>
      ))}
    </div>
  );
}

function Resident({ room, id, npc }: { room: StudyRoom; id: string; npc: NpcView }) {
  const update = (settings: Record<string, unknown>) => room.send('npc:update', { id, settings });
  const isCat = npc.kind === 'cat';
  const coat = isCat ? COAT_BY_ID.get(parseJson<{ coat?: string }>(npc.look, {}).coat ?? '') : undefined;
  const cat = parseJson<Partial<CatSettings>>(npc.settings, {});
  const buddy = parseJson<Partial<BuddySettings>>(npc.settings, {});
  const [subject, setSubject] = useState(buddy.subject ?? '');

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-line bg-white p-3">
      <div className="flex items-center gap-2">
        <span className="text-2xl">{isCat ? '🐈' : '🧑‍🎓'}</span>
        <div className="min-w-0 flex-1">
          <RenameField key={`${id}:${npc.name}`} room={room} id={id} name={npc.name} />
        </div>
        <button
          onClick={() => room.send('npc:remove', { id })}
          className="rounded-lg border border-line bg-white px-2 py-1 text-xs font-bold whitespace-nowrap"
        >
          👋 Goodbye
        </button>
      </div>
      <p className="text-[11px] text-muted">
        {isCat
          ? `${coat?.label ?? 'Cat'} · ${npc.anim === 'nap' ? 'napping 💤' : npc.moving ? 'exploring' : 'chilling'}`
          : `${npc.status === 'focus' ? `focusing on ${npc.subject}` : npc.status === 'break' ? 'on a break' : 'looking for a seat'}`}
      </p>
      {isCat ? (
        <Toggle on={cat.roam !== false} labels={['Roams the room', 'Stays in the nook']} onChange={(roam) => update({ roam })} />
      ) : (
        <div className="flex flex-col gap-1.5">
          <input
            value={subject}
            maxLength={SUBJECT_MAX}
            onChange={(e) => setSubject(e.target.value)}
            onBlur={() => subject.trim() && update({ subject })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
            placeholder="Subject"
            aria-label="Subject"
            className="rounded-lg border border-line bg-white px-2.5 py-1 text-xs outline-none focus:border-accent"
          />
          <div className="grid grid-cols-2 gap-1.5">
            <Toggle on={buddy.focusMin !== 50} labels={['25 / 5', '50 / 10']} onChange={(short) => update({ focusMin: short ? 25 : 50 })} />
            <Toggle on={buddy.chatty !== false} labels={['Chatty', 'Quiet']} onChange={(chatty) => update({ chatty })} />
          </div>
        </div>
      )}
    </li>
  );
}
