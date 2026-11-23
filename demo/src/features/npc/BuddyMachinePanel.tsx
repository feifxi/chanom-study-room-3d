'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { COAT_BY_ID, NPC_LIMITS, SUMMON_COOLDOWN_MS, SUMMON_REVEAL_MS, parseJson, type NpcKind, type NpcView } from '@connecta/shared';
import { cn } from '@/lib/utils';
import { useDismiss } from '../room/useDismiss';

const KINDS: { kind: NpcKind; emoji: string; title: string; blurb: string; tint: string }[] = [
  { kind: 'cat', emoji: '🐈', title: 'A cat', blurb: 'Wanders, naps somewhere cosy, follows you after head pats', tint: 'bg-mint' },
  { kind: 'buddy', emoji: '🧑‍🎓', title: 'A study buddy', blurb: 'Takes a free desk and focuses with you', tint: 'bg-sky' },
];

export interface MachineSummon {
  kind: NpcKind;
  name: string;
  label: string;
  at: number;
}

/**
 * The Buddy Machine (feature 6): walk up and press E. Summon a cat or a study buddy for the whole
 * room (a capsule rolls out of the machine and pops open), or say goodbye to one. Nobody owns them:
 * anyone can summon, anyone can send one home. Up to 4 cats and 5 study buddies, 9 in all; they go
 * home when the room empties.
 */
export function BuddyMachinePanel({
  npcs,
  lastSummon,
  error,
  onSummon,
  onGoodbye,
  onClose,
}: {
  npcs: [string, NpcView][];
  /** Your latest summon: the cooldown and the "rolling out…" line */
  lastSummon?: MachineSummon;
  error: string | null;
  onSummon: (kind: NpcKind) => void;
  onGoodbye: (id: string) => void;
  onClose: () => void;
}) {
  const panel = useDismiss<HTMLDivElement>(true, onClose);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);
  const count = (kind?: NpcKind) => npcs.filter(([, n]) => !kind || n.kind === kind).length;
  const cooldown = lastSummon ? Math.max(0, SUMMON_COOLDOWN_MS - (now - lastSummon.at)) : 0;
  const recent = lastSummon && now - lastSummon.at < 6000 ? lastSummon : undefined;

  return (
    <div ref={panel} className="panel flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-2 p-3" aria-label="Buddy Machine">
      <div className="flex items-start gap-2 px-1">
        <div className="flex-1">
          <h2 className="text-sm font-black">Buddy Machine ✨</h2>
          <p className="text-[11px] text-muted-foreground">Summon a friend for everyone in the room</p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>

      {KINDS.map((k) => {
        const full = count(k.kind) >= NPC_LIMITS[k.kind] || count() >= NPC_LIMITS.total;
        return (
          <div key={k.kind} className="flex items-center gap-3 rounded-2xl border bg-card/70 p-2">
            <span className={cn('grid size-10 flex-none place-items-center rounded-xl text-xl', k.tint)}>{k.emoji}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-extrabold">
                {k.title}{' '}
                <span className="text-[11px] font-bold text-muted-foreground tabular-nums">
                  {count(k.kind)}/{NPC_LIMITS[k.kind]}
                </span>
              </span>
              <span className="block text-[11px] leading-snug text-muted-foreground">{k.blurb}</span>
            </span>
            <button
              onClick={() => onSummon(k.kind)}
              disabled={full || cooldown > 0}
              className="rounded-full bg-primary px-3 py-1 text-xs font-extrabold whitespace-nowrap text-primary-foreground hover:bg-primary-ink disabled:bg-muted disabled:text-muted-foreground"
            >
              {full ? 'Full' : cooldown > 0 ? `${Math.ceil(cooldown / 1000)}s` : 'Summon'}
            </button>
          </div>
        );
      })}
      <p aria-live="polite" className="min-h-4 px-1 text-xs font-bold">
        {error ? (
          <span className="text-destructive">{error}</span>
        ) : recent ? (
          <span className="text-primary">
            {now - recent.at < SUMMON_REVEAL_MS ? 'A capsule is rolling out… 🫧' : `${recent.name} the ${recent.label} is here ✨`}
          </span>
        ) : null}
      </p>

      <h3 className="px-1 text-[11px] font-black tracking-wider text-muted-foreground uppercase">In the room · {npcs.length}</h3>
      {npcs.length === 0 ? (
        <p className="px-1 text-xs text-muted-foreground">Nobody yet. Summon someone!</p>
      ) : (
        <ul className="flex max-h-56 flex-col gap-1 overflow-y-auto">
          {npcs.map(([id, n]) => (
            <li key={id} className="flex items-center gap-2.5 rounded-xl bg-muted/60 px-2.5 py-1.5">
              <span className="text-lg">{n.kind === 'cat' ? '🐈' : '🧑‍🎓'}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-extrabold">{n.name}</span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {n.kind === 'cat'
                    ? `${COAT_BY_ID.get(parseJson<{ coat?: string }>(n.look, {}).coat ?? '')?.label ?? 'Cat'}${n.anim === 'nap' ? ' · napping 💤' : ''}`
                    : `Studying ${n.subject}`}
                </span>
              </span>
              <button
                onClick={() => onGoodbye(id)}
                className="rounded-full border bg-card px-2.5 py-1 text-xs font-extrabold hover:bg-muted"
              >
                Goodbye 👋
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="px-1 text-[11px] text-muted-foreground">
        Up to {NPC_LIMITS.cat} cats and {NPC_LIMITS.buddy} study buddies. They go home when the room empties.
      </p>
    </div>
  );
}
