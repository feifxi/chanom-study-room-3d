'use client';

import { cn } from '@/lib/utils';
import type { SpotState } from '../hub';
import { ASK_MS, LETTERS, REVEAL_MS, ZONE_COLORS, sidesFor, type SideGame } from './game';

/**
 * Pick a Side's small HUD under the top strip: the question, the timer and the answers with live
 * counts. The room stays in view, because the game is where everyone stands.
 */
export function SideHud({
  game,
  st,
  myZone,
  liveCounts,
  name,
  now,
}: {
  game: SideGame;
  st: SpotState;
  /** The zone you're standing in right now. */
  myZone: number | null;
  /** How many players stand in each zone right now. */
  liveCounts: number[];
  name: (id: string) => string;
  now: number;
}) {
  const q = game.questions[game.i];
  if (!q || game.stage === 'done') return null;
  const sides = sidesFor(game.mode);
  const revealing = game.stage === 'reveal';
  const out = st.out.includes('me');
  const counts = revealing
    ? Array.from({ length: sides }, (_, i) => Object.values(game.answers).filter((a) => a === i).length)
    : liveCounts;
  const total = counts.reduce((a, b) => a + b, 0);
  const span = revealing ? REVEAL_MS : ASK_MS[game.mode];
  const left = Math.max(0, game.until - now);
  const mine = revealing ? game.answers.me : myZone;

  return (
    <section className="panel flex w-[460px] max-w-[calc(100vw-1.5rem)] flex-col gap-2 p-3" aria-label="Pick a Side">
      <div className="flex items-center gap-2 text-[11px] font-bold text-muted-foreground">
        <span>
          Question {game.i + 1} of {game.questions.length}
        </span>
        <span>·</span>
        <span className="truncate">
          {game.deck.emoji} {game.deck.name}
        </span>
        {game.mode === 'last' && <span className="ml-auto">{st.players.length} left</span>}
        {game.mode === 'quiz' && <Leaders game={game} name={name} />}
        <span
          className={cn(
            'rounded-full px-2 py-0.5 font-mono font-black tabular-nums',
            game.mode === 'wyr' && 'ml-auto',
            revealing ? 'bg-secondary text-foreground' : left < 4000 ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
          )}
        >
          {revealing ? 'Answer' : `0:${String(Math.ceil(left / 1000)).padStart(2, '0')}`}
        </span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary/70 transition-[width] duration-1000 ease-linear"
          style={{ width: `${(left / span) * 100}%` }}
        />
      </div>

      <p className="text-center text-lg leading-snug font-black">{q.q}</p>

      <div className={cn('grid gap-1.5', 'grid-cols-2')}>
        {q.answers.map((a, i) => {
          const right = revealing && game.mode !== 'wyr' && q.right === i;
          const faded = revealing && game.mode !== 'wyr' && !right;
          return (
            <div
              key={i}
              className={cn(
                'relative flex items-center gap-2 overflow-hidden rounded-xl border-2 bg-card px-2 py-1.5 text-sm font-bold',
                mine === i ? 'border-foreground/70' : 'border-transparent bg-muted/60',
                faded && 'opacity-45',
                right && 'border-emerald-500',
              )}
            >
              {/* At the reveal a bar shows how the room split */}
              {revealing && total > 0 && (
                <span
                  className="absolute inset-y-0 left-0 opacity-25"
                  style={{ width: `${(counts[i]! / total) * 100}%`, background: ZONE_COLORS[i] }}
                />
              )}
              <span
                className="relative grid size-6 flex-none place-items-center rounded-full text-xs font-black text-white"
                style={{ background: ZONE_COLORS[i] }}
              >
                {right ? '✓' : LETTERS[i]}
              </span>
              <span className="relative min-w-0 flex-1 leading-tight">{a}</span>
              <span className="relative text-xs font-black text-muted-foreground tabular-nums">{counts[i] ?? 0}</span>
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs font-bold text-muted-foreground">
        {revealing && 'me' in game.answers ? (
          <Verdict game={game} name={name} counts={counts} />
        ) : out ? (
          <>💀 You’re out · watch from the edge, you’ll be back next game</>
        ) : revealing ? (
          <>Next question coming…</>
        ) : mine != null ? (
          <>
            You’re on <b className="text-foreground">{LETTERS[mine]}</b> · you can still move
          </>
        ) : (
          <>Walk into a {sides === 2 ? 'side' : 'zone'} to answer</>
        )}
      </p>
    </section>
  );
}

/** Quiz: the top three scores so far. */
function Leaders({ game, name }: { game: SideGame; name: (id: string) => string }) {
  const top = Object.entries(game.scores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);
  if (!top.length) return <span className="ml-auto" />;
  return (
    <span className="ml-auto truncate">
      {/* Ties share a medal */}
      {top
        .map(([id, n]) => `${['🥇', '🥈', '🥉'][top.filter(([, m]) => m > n).length]} ${id === 'me' ? 'you' : name(id)} ${n}`)
        .join(' · ')}
    </span>
  );
}

function Verdict({ game, name, counts }: { game: SideGame; name: (id: string) => string; counts: number[] }) {
  const q = game.questions[game.i]!;
  const a = game.answers.me;
  if (game.mode === 'wyr') {
    if (a == null) return <>You didn’t pick a side this time</>;
    const withMe = Object.entries(game.answers)
      .filter(([id, x]) => id !== 'me' && x === a)
      .map(([id]) => name(id));
    const other = counts[1 - a] ?? 0;
    const mineN = counts[a] ?? 0;
    const crowd = mineN === other ? 'an even split' : mineN > other ? 'you’re with the many 🙌' : 'you’re with the few 😎';
    return (
      <>
        {counts[0]} vs {counts[1]} · {crowd}
        {withMe.length > 0 && <> · {list(withMe)} picked with you</>}
      </>
    );
  }
  if (game.everyoneWrong) return <>Everyone was wrong, so nobody’s out 😅</>;
  if (a == null)
    return (
      <>
        {game.mode === 'last' ? '💀 No answer, you’re out' : 'No answer'} · it was {LETTERS[q.right!]}
      </>
    );
  if (a === q.right) return <span className="text-emerald-600">✓ Right! {game.mode === 'quiz' ? '+1' : 'You’re still in'}</span>;
  if (game.mode === 'last') return <>💀 Wrong side, you’re out · it was {LETTERS[q.right!]}</>;
  return <>Not this time · it was {LETTERS[q.right!]}</>;
}

export const list = (names: string[]) =>
  names.length <= 2 ? names.join(' and ') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
