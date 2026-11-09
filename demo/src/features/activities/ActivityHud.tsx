'use client';

import type { ReactNode } from 'react';
import { Crown, LogOut, Megaphone, Play, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GRACE_MS, INVITE_MS, type Invite, type SpotState } from './hub';
import type { Spot } from './spots';

/**
 * The framework's UI, the same for every activity (feature 9). Each game adds its own layers on top
 * (3D, a small HUD or a big panel), designed in its own feature:
 * - **Lobby card** (above the dock): who's in, the host's game picker, 📣 Call everyone, Start
 * - **Top strip** while playing: "🃏 Slave · 3 playing · Leave", always in the same place
 * - **Results card**, then back to the lobby
 * - **Invite cards** (top right), and the "come back" banner when you've walked off mid-round
 */

export interface Who {
  name: string;
  color: string;
}

function Face({ who, host, size = 30 }: { who: Who; host?: boolean; size?: number }) {
  return (
    <span className="relative flex-none" title={who.name}>
      <span
        className="grid place-items-center rounded-full font-black text-white ring-2 ring-card"
        style={{ width: size, height: size, background: who.color, fontSize: size * 0.42 }}
      >
        {who.name[0]?.toUpperCase()}
      </span>
      {host && <Crown className="absolute -top-2 left-1/2 size-3.5 -translate-x-1/2 fill-amber-300 text-amber-500" aria-label="Host" />}
    </span>
  );
}

export function LobbyCard({
  spot,
  st,
  who,
  now,
  isHost,
  onPickGame,
  onCall,
  onStart,
  onLeave,
  extra,
}: {
  spot: Spot;
  st: SpotState;
  who: (id: string) => Who;
  now: number;
  isHost: boolean;
  onPickGame: (id: string) => void;
  /** The game's own lobby settings (Pick a Side: the deck). */
  extra?: ReactNode;
  onCall: () => void;
  onStart: () => void;
  onLeave: () => void;
}) {
  const { game } = st;
  const seats = spot.seats ? Math.min(spot.seats.length, game.max) : 0;
  const enough = st.players.length >= game.min;
  const counting = st.startsAt > now;
  return (
    <section className="panel flex w-[380px] max-w-[calc(100vw-1.5rem)] flex-col gap-2.5 p-3" aria-label={`${game.name} lobby`}>
      <div className="flex items-center gap-2">
        <span className={cn('grid size-9 flex-none place-items-center rounded-xl text-lg', spot.tint)}>{game.emoji}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-black">
            {game.name} <span className="font-semibold text-muted-foreground">· {spot.activity}</span>
          </span>
          <span className="block text-[11px] text-muted-foreground">
            {counting
              ? `Starting in ${Math.ceil((st.startsAt - now) / 1000)}…`
              : enough
                ? `${st.players.length} in · ${isHost ? 'start when you’re ready' : `waiting for ${who(st.hostId ?? '').name} to start`}`
                : `${st.players.length} in · needs ${game.min - st.players.length} more`}
          </span>
        </span>
        <button
          onClick={onLeave}
          className="flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <LogOut className="size-3.5" /> Leave
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {st.players.map((id) => (
          <Face key={id} who={who(id)} host={id === st.hostId} />
        ))}
        {/* Empty seats invite people to sit; standing spots just show the count */}
        {Array.from({ length: Math.max(0, seats - st.players.length) }).map((_, i) => (
          <span
            key={i}
            className="grid size-[30px] place-items-center rounded-full border-2 border-dashed text-xs font-black text-muted-foreground"
          >
            +
          </span>
        ))}
        <span className="ml-auto text-[11px] text-muted-foreground">
          {game.min === game.max ? game.min : `${game.min}–${Math.min(game.max, seats || game.max)}`} players
        </span>
      </div>

      {extra}

      {isHost ? (
        <div className="flex items-center gap-1.5">
          {spot.games.length > 1 && (
            <select
              value={game.id}
              onChange={(e) => onPickGame(e.target.value)}
              disabled={counting}
              className="h-8 min-w-0 flex-1 rounded-full border bg-card px-2.5 text-xs font-bold"
              aria-label="Game"
            >
              {spot.games.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.emoji} {g.name}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={onCall}
            disabled={!!st.invite}
            className="flex h-8 items-center gap-1 rounded-full border bg-card px-3 text-xs font-extrabold hover:bg-muted disabled:text-muted-foreground disabled:hover:bg-card"
          >
            <Megaphone className="size-3.5" /> {st.invite ? 'Called ✓' : 'Call everyone'}
          </button>
          <button
            onClick={onStart}
            disabled={!enough || counting}
            className="flex h-8 items-center gap-1 rounded-full bg-primary px-3.5 text-xs font-extrabold text-primary-foreground hover:bg-primary-ink disabled:opacity-45"
          >
            <Play className="size-3.5 fill-current" /> Start
          </button>
        </div>
      ) : (
        <p className="rounded-xl bg-muted px-3 py-1.5 text-center text-xs font-semibold text-muted-foreground">
          You’re in. {who(st.hostId ?? '').name} starts the game.
        </p>
      )}
    </section>
  );
}

export function PlayStrip({
  st,
  verb,
  onLeave,
  onEnd,
  isHost,
}: {
  st: SpotState;
  /** "playing" for games, "watching" for the big screen. */
  verb: string;
  onLeave: () => void;
  onEnd: () => void;
  isHost: boolean;
}) {
  return (
    <div className="panel flex items-center gap-2 rounded-full py-1 pr-1 pl-3 text-xs font-extrabold whitespace-nowrap">
      <span>
        {st.game.emoji} {st.game.name}
      </span>
      <span className="font-semibold text-muted-foreground">
        · {st.players.length} {verb}
        {st.nextRound.length > 0 && ` · ${st.nextRound.length} next round`}
      </span>
      {isHost && (
        <button onClick={onEnd} className="rounded-full px-2.5 py-1 hover:bg-muted">
          End
        </button>
      )}
      <button
        onClick={onLeave}
        className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 hover:bg-destructive/10 hover:text-destructive"
      >
        <LogOut className="size-3.5" /> Leave
      </button>
    </div>
  );
}

/** You're in the next round: you can watch in 3D meanwhile. */
export function NextRoundCard({ st }: { st: SpotState }) {
  return (
    <div className="panel px-4 py-2 text-xs font-bold">
      {st.game.emoji} {st.game.name} is mid-round · you’re in the next one
    </div>
  );
}

export function ResultsCard({
  st,
  who,
  isHost,
  now,
  onAgain,
  onLeave,
  title,
  detail,
  medals = true,
}: {
  st: SpotState;
  who: (id: string) => Who;
  isHost: boolean;
  now: number;
  onAgain: () => void;
  onLeave: () => void;
  /** Games with their own headline ("Jod and Mai tie!", or no winner at all). */
  title?: string;
  /** A short line per player, e.g. "7 right". */
  detail?: (id: string) => string;
  medals?: boolean;
}) {
  return (
    <section className="panel flex w-[340px] max-w-[calc(100vw-1.5rem)] flex-col gap-2 p-3" aria-label="Results">
      <p className="text-center text-sm font-black">
        {title ?? `${st.game.emoji} ${st.game.name} · ${st.results[0] === 'me' ? 'You won! 🎉' : `${who(st.results[0] ?? '').name} won!`}`}
      </p>
      <ol className="flex flex-col gap-1">
        {st.results.map((id, i) => (
          <li key={id} className={cn('flex items-center gap-2 rounded-xl px-2 py-1 text-sm', id === 'me' && 'bg-secondary font-bold')}>
            {medals && <span className="w-5 text-center">{['🥇', '🥈', '🥉'][i] ?? i + 1}</span>}
            <Face who={who(id)} size={22} />
            <span className="flex-1 truncate">
              {who(id).name}
              {id === 'me' && ' (you)'}
            </span>
            {detail && <span className="text-xs text-muted-foreground">{detail(id)}</span>}
          </li>
        ))}
      </ol>
      <div className="flex gap-1.5">
        <button onClick={onLeave} className="flex-1 rounded-full border py-1.5 text-xs font-extrabold hover:bg-muted">
          Leave
        </button>
        {isHost ? (
          <button
            onClick={onAgain}
            className="flex-1 rounded-full bg-primary py-1.5 text-xs font-extrabold text-primary-foreground hover:bg-primary-ink"
          >
            Play again
          </button>
        ) : (
          <span className="flex-1 py-1.5 text-center text-[11px] text-muted-foreground">
            Back to the lobby in {Math.max(0, Math.ceil((st.resultsUntil - now) / 1000))} s
          </span>
        )}
      </div>
    </section>
  );
}

/** Walked off mid-round: 30 s to come back before you're out. */
export function AwayBanner({ since, now }: { since: number; now: number }) {
  const left = Math.max(0, Math.ceil((GRACE_MS - (now - since)) / 1000));
  return (
    <div className="rounded-full bg-amber-100 px-4 py-1.5 text-xs font-extrabold text-amber-900 shadow-soft">
      Come back to stay in the game · 0:{String(left).padStart(2, '0')}
    </div>
  );
}

/** Invite cards: the same for every activity. No sound, never takes focus, gone after ~20 s. */
export function InviteStack({
  invites,
  spots,
  states,
  who,
  now,
  onGo,
  onDismiss,
}: {
  invites: Invite[];
  spots: (id: Invite['spotId']) => Spot;
  states: (id: Invite['spotId']) => SpotState;
  who: (id: string) => Who;
  now: number;
  onGo: (i: Invite) => void;
  onDismiss: (i: Invite) => void;
}) {
  if (!invites.length) return null;
  const shown = invites.slice(-2);
  return (
    <div className="flex w-[290px] max-w-[calc(100vw-1.5rem)] flex-col gap-1.5" aria-live="polite">
      {invites.length > 2 && (
        <p className="text-right text-[11px] font-bold text-muted-foreground">+{invites.length - 2} more under Activities</p>
      )}
      {shown.map((inv) => {
        const spot = spots(inv.spotId);
        const st = states(inv.spotId);
        return (
          <div key={inv.key} className="panel relative overflow-hidden p-2.5 pr-8">
            <button
              onClick={() => onDismiss(inv)}
              aria-label="Not now"
              className="absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-full text-muted-foreground hover:bg-muted"
            >
              <X className="size-3.5" />
            </button>
            <div className="flex items-center gap-2.5">
              <span className={cn('grid size-9 flex-none place-items-center rounded-xl text-lg', spot.tint)}>{st.game.emoji}</span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-extrabold">
                  {who(inv.by).name} is starting {st.game.name}
                </span>
                <span className="block text-[11px] text-muted-foreground">
                  {spot.activity} at the {spot.name.toLowerCase()} · {st.players.length} joined
                </span>
              </span>
            </div>
            <button
              onClick={() => onGo(inv)}
              className="mt-2 w-full rounded-full bg-primary py-1.5 text-xs font-extrabold text-primary-foreground hover:bg-primary-ink"
            >
              Go there
            </button>
            {/* Time left before it fades */}
            <span
              className="absolute bottom-0 left-0 h-0.5 bg-primary/50"
              style={{ width: `${Math.max(0, 1 - (now - inv.at) / INVITE_MS) * 100}%` }}
            />
          </div>
        );
      })}
    </div>
  );
}
