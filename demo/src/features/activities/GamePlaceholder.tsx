'use client';

import type { SpotState } from './hub';
import type { Spot } from './spots';

/**
 * Stand-ins for the games themselves, so the shared flow can be tried end to end. Each real game is
 * designed in its own feature (cards: 12, Pick a Side: 11), mixing the 3D world, a small HUD and a
 * big panel as it needs.
 */
export function GamePlaceholder({
  spot,
  st,
  now,
  onFinish,
  onSomeoneLeaves,
}: {
  spot: Spot;
  st: SpotState;
  now: number;
  onFinish: () => void;
  onSomeoneLeaves: () => void;
}) {
  if (spot.id === 'floor') {
    // Small HUD: the room stays fully visible, because the game is where you stand
    const left = Math.max(0, 15 - Math.floor((now - st.since) / 1000));
    return (
      <div className="panel flex w-[340px] max-w-[calc(100vw-1.5rem)] flex-col items-center gap-1 px-4 py-3 text-center">
        <p className="text-[11px] font-bold text-muted-foreground">Walk to your side · 0:{String(left).padStart(2, '0')}</p>
        <p className="text-lg font-black">Cats 🐱 or dogs 🐶?</p>
        <p className="text-[11px] text-muted-foreground">Placeholder · Pick a Side is designed in feature 11</p>
      </div>
    );
  }
  // Big panel: your hand needs detail; the room stays alive behind it, and voice keeps working
  return (
    <section className="panel flex w-[560px] max-w-[calc(100vw-1.5rem)] flex-col gap-3 p-4" aria-label={st.game.name}>
      <div className="grid h-36 place-items-center rounded-2xl bg-gradient-to-br from-mint/70 to-secondary text-center">
        <div>
          <p className="text-3xl">🂠 🂠 🂠 🂠 🂠</p>
          <p className="mt-1 text-sm font-black">Your hand goes here</p>
          <p className="text-xs text-muted-foreground">
            Placeholder · {st.game.name} is designed in feature {spot.feature}. Cards played land on the 3D table.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-1.5 text-xs font-bold">
        <span className="text-muted-foreground">Demo:</span>
        <button onClick={onFinish} className="rounded-full border px-3 py-1 hover:bg-muted">
          Finish the round
        </button>
        <button onClick={onSomeoneLeaves} className="rounded-full border px-3 py-1 hover:bg-muted">
          Someone else leaves
        </button>
      </div>
    </section>
  );
}
