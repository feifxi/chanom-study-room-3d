'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { NPC_LIMITS, SUMMON_COOLDOWN_MS, SUMMON_REVEAL_MS, type NpcKind, type NpcView } from '@study/shared';
import { useNow } from '@/lib/time';
import type { StudyRoom, Summon } from '../room/roomSession';

const KINDS: { kind: NpcKind; icon: string; title: string; blurb: string; tint: string }[] = [
  { kind: 'cat', icon: '🐈', title: 'Library cat', blurb: 'Wanders, naps on the sofa, loves head pats.', tint: 'bg-mint' },
  { kind: 'buddy', icon: '🧑‍🎓', title: 'Study buddy', blurb: 'Takes a free desk and studies with you.', tint: 'bg-lavender' },
];

interface Props {
  room: StudyRoom;
  npcIds: string[];
  summons: Summon[];
  error: string | null;
  onClose: () => void;
}

/** The Buddy Machine: summon a cat or a study buddy for the whole room, or send one home. */
export function BuddyMachinePanel({ room, npcIds, summons, error, onClose }: Props) {
  const now = useNow(250);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const residents = npcIds.map((id) => [id, room.state.npcs?.get(id)] as const).filter((e): e is readonly [string, NpcView] => !!e[1]);
  const count = (kind?: NpcKind) => residents.filter(([, n]) => !kind || n.kind === kind).length;
  // Your latest summon drives the cooldown and the status line. A refused summon never
  // arrives here, so it doesn't start a cooldown (the server enforces it anyway).
  const mine = summons.findLast((s) => s.bySessionId === room.sessionId);
  const cooldown = mine ? Math.max(0, SUMMON_COOLDOWN_MS - (now - mine.at)) : 0;
  const recent = mine && now - mine.at < 6000 ? mine : undefined;

  return (
    <aside
      aria-label="Buddy Machine"
      className="panel absolute top-[76px] right-4 bottom-24 z-20 flex w-[min(360px,calc(100vw-32px))] flex-col gap-4 overflow-y-auto p-5"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-extrabold tracking-[-0.02em]">Buddy Machine</h2>
          <p className="text-xs text-muted">Summon a friend for the whole room.</p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="grid size-8 place-items-center rounded-lg text-muted hover:bg-soft hover:text-ink"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {KINDS.map((k) => {
          const full = count(k.kind) >= NPC_LIMITS[k.kind] || count() >= NPC_LIMITS.total;
          return (
            <button
              key={k.kind}
              onClick={() => room.send('npc:summon', { kind: k.kind })}
              disabled={full || cooldown > 0}
              className="flex items-center gap-3 rounded-2xl border border-line bg-white p-3 text-left disabled:opacity-50"
            >
              <span className={`grid size-12 flex-none place-items-center rounded-xl text-2xl ${k.tint}`}>{k.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold">
                  {k.title}{' '}
                  <span className="font-mono text-xs font-normal text-muted">
                    {count(k.kind)}/{NPC_LIMITS[k.kind]}
                  </span>
                </span>
                <span className="block text-xs text-muted">{k.blurb}</span>
              </span>
              <span className="rounded-lg bg-accent px-3 py-1.5 text-xs font-bold whitespace-nowrap text-white">
                {full ? 'Full' : cooldown > 0 ? `${Math.ceil(cooldown / 1000)}s` : 'Summon'}
              </span>
            </button>
          );
        })}
        <p aria-live="polite" className="min-h-4 text-xs font-semibold">
          {error ? (
            <span className="text-rose-ink">{error}</span>
          ) : recent ? (
            <span className="text-accent-ink">
              {now - recent.at < SUMMON_REVEAL_MS ? 'A capsule is rolling out…' : `${recent.name} the ${recent.label} is here ✨`}
            </span>
          ) : null}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-bold text-muted">In the room · {residents.length}</h3>
        {residents.length === 0 && <p className="text-sm text-muted">Nobody yet.</p>}
        <ul className="flex flex-col gap-1.5">
          {residents.map(([id, n]) => (
            <li key={id} className="flex items-center gap-2.5 rounded-xl bg-soft px-3 py-2">
              <span className="text-lg">{n.kind === 'cat' ? '🐈' : '🧑‍🎓'}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-bold">{n.name}</span>
              <button
                onClick={() => room.send('npc:remove', { id })}
                className="rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-bold"
              >
                Goodbye 👋
              </button>
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-auto text-[11px] text-muted">Up to {NPC_LIMITS.total} friends per room. They go home when the room closes.</p>
    </aside>
  );
}
