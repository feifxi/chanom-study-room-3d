'use client';

import { cn } from '@/lib/utils';
import type { SpotState } from '../activities/hub';
import { SPOTS, type Spot, type SpotId } from '../activities/spots';

/**
 * What you can do in this room, live. Every activity lives at a spot in the map; "Go there" runs you
 * over, and you start or join it there yourself (sit down, or press E), the same way for every game.
 */
export function ActivitiesPanel({
  states,
  roomWideGames,
  watchTitle,
  hostName,
  onGo,
}: {
  states: Record<SpotId, SpotState>;
  roomWideGames: boolean;
  /** What's on the big screen. */
  watchTitle?: string;
  hostName: (id: string) => string;
  onGo: (spot: Spot) => void;
}) {
  return (
    <div className="panel flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-2 p-3">
      <div className="flex items-center gap-2 px-1">
        <h2 className="flex-1 text-sm font-black">Things to do here</h2>
      </div>
      {!roomWideGames && (
        <p className="rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
          Room-wide games are off in this room. Tables, the TV and the board still work.
        </p>
      )}
      {SPOTS.map((spot) => {
        const st = states[spot.id];
        const off = spot.roomWide && !roomWideGames;
        const live = st.phase === 'gathering' || st.phase === 'playing';
        const status = !spot.built
          ? `Comes with feature ${spot.feature}`
          : off
            ? 'Off in this room'
            : st.phase === 'gathering'
              ? `${st.game.name} · ${st.players.length} in · ${hostName(st.hostId ?? '')} hosting`
              : st.phase === 'playing' && spot.id === 'board'
                ? `${st.players.length} drawing`
                : st.phase === 'playing' && spot.kind === 'drop-in'
                  ? `${watchTitle ?? 'Something’s on'} · ${st.players.length} watching`
                  : st.phase === 'playing'
                    ? `${st.game.name} · ${st.players.length} playing`
                    : st.phase === 'results'
                      ? `${st.game.name} · just finished`
                      : spot.seats
                        ? 'Free · sit down to start a game'
                        : spot.id === 'board'
                          ? 'Free · go there and press E to draw'
                          : spot.kind === 'drop-in'
                            ? 'Off · go there and press E to put something on'
                            : 'Free · go there and press E to start';
        return (
          <div
            key={spot.id}
            className={cn('flex items-center gap-3 rounded-2xl border bg-card/70 p-2', (!spot.built || off) && 'opacity-50')}
          >
            <span className={cn('relative grid size-10 flex-none place-items-center rounded-xl text-xl', spot.tint)}>
              {spot.emoji}
              {live && (
                <span
                  className={cn(
                    'absolute -top-0.5 -right-0.5 size-3 rounded-full ring-2 ring-card',
                    st.phase === 'gathering' ? 'animate-pulse bg-online' : 'bg-primary',
                  )}
                  aria-label={st.phase === 'gathering' ? 'Gathering players' : 'Playing'}
                />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-extrabold">{spot.name}</span>
              <span className="block truncate text-[11px] text-muted-foreground">{status}</span>
            </span>
            {spot.built && !off && (
              <button
                onClick={() => onGo(spot)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-extrabold',
                  st.phase === 'gathering' ? 'bg-primary text-primary-foreground hover:bg-primary-ink' : 'border bg-card hover:bg-muted',
                )}
              >
                Go there
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
