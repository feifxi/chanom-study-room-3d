'use client';

import { useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDismiss } from '../../room/useDismiss';
import { Face, type Who } from '../ActivityHud';
import { SUITS, TITLE, canPlay, isRed, rankLabel, suitOf, turnMs, SWAP_MS, type Card, type SlaveGame } from './game';

/**
 * Slave up close (docs/features/11-table-games.md), a theater while you play: the others around the top with their card
 * counts, the pile on the felt in the middle, your hand fanned along the bottom. Tap cards to pick
 * them; Play lights up only when they make a legal play. People standing by the table watch: a
 * small view in the corner (whose turn, the pile), a click makes it big. Watchers never see a hand.
 */
export function SlavePanel({
  game: g,
  who,
  now,
  onPlay,
  onPass,
  onGiveBack,
  mini = false,
  onMini,
}: {
  game: SlaveGame;
  who: (id: string) => Who;
  now: number;
  onPlay: (cards: Card[]) => void;
  onPass: () => void;
  onGiveBack: (cards: Card[]) => void;
  /** A watcher's small view in the corner. */
  mini?: boolean;
  onMini?: (mini: boolean) => void;
}) {
  const me = 'me';
  // Not in this game, or left it: you watch
  const watching = !g.players.includes(me) || g.gone.includes(me);
  const panel = useDismiss<HTMLElement>(watching && !mini, () => onMini?.(true));
  const hand = g.hands[me] ?? [];
  const [picked, setPicked] = useState<Card[]>([]);
  // The game moved on (a play, a new trick, a new game): drop picks that aren't in your hand any more
  const [seenRev, setSeenRev] = useState(g.rev);
  if (seenRev !== g.rev) {
    setSeenRev(g.rev);
    setPicked((p) => p.filter((c) => (g.hands[me] ?? []).includes(c)));
  }
  const toggle = (c: Card) => setPicked((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));

  const myTurn = g.stage === 'play' && g.turn === me;
  const mySwap = g.stage === 'swap' ? g.swap.find((s) => s.giver === me) : undefined;
  const iGave = g.stage === 'swap' ? g.swap.find((s) => s.to === me) : undefined;
  const legal = myTurn && canPlay(g, picked);
  const out = g.finished.includes(me) || g.gone.includes(me);
  const name = (id: string) => (id === me ? 'You' : who(id).name);
  // The others, in turn order starting after you
  const i = Math.max(0, g.players.indexOf(me));
  const others = watching ? g.players : [...g.players.slice(i + 1), ...g.players.slice(0, i)].filter((id) => id !== me);
  const total = g.stage === 'swap' ? SWAP_MS : turnMs(g.players.length);
  const left = Math.max(0, Math.min(1, (g.until - now) / total));
  const kind = (n: number) => ['', 'a single', 'a pair', 'a triple', 'four of a kind'][n];

  const status = watching
    ? g.stage === 'swap'
      ? 'Swapping cards…'
      : g.stage === 'done'
        ? 'Game over'
        : `${name(g.turn)}’s turn`
    : g.stage === 'swap'
      ? mySwap
        ? `${TITLE[g.titles[me]!].emoji} Pick ${mySwap.count} to give back`
        : 'Swapping cards…'
      : out
        ? g.finished.includes(me)
          ? 'You’re out of cards! 🎉'
          : 'You left this game'
        : myTurn
          ? g.pile
            ? 'Your turn: beat it or pass'
            : 'Your lead: play anything'
          : `${who(g.turn).name} is thinking…`;

  if (mini)
    return (
      <section ref={panel} className="panel flex w-[240px] flex-col gap-1.5 p-2" aria-label="Slave">
        <div className="flex items-center gap-2 px-1">
          <span className="min-w-0 flex-1 truncate text-xs font-black">🃏 Slave · {status}</span>
          <button
            onClick={() => onMini?.(false)}
            aria-label="Make it bigger"
            className="grid size-7 place-items-center rounded-full hover:bg-muted"
          >
            <Maximize2 className="size-3.5" />
          </button>
        </div>
        <button
          onClick={() => onMini?.(false)}
          aria-label="Make it bigger"
          className="grid min-h-[88px] place-items-center rounded-xl bg-[radial-gradient(circle,#2f8a6a_0%,#1f6b52_100%)] p-2 text-white"
        >
          {g.pile ? (
            <span className="flex flex-col items-center gap-1">
              <span className="flex gap-0.5">
                {g.pile.cards.map((c) => (
                  <PlayingCard key={c} card={c} small />
                ))}
              </span>
              <span className="text-[11px] font-bold opacity-85">
                {name(g.pile.by)} played {kind(g.pile.cards.length)}
              </span>
            </span>
          ) : (
            <span className="text-xs font-black opacity-90">{g.stage === 'swap' ? 'Swapping cards…' : `${name(g.turn)} leads`}</span>
          )}
        </button>
        <p className="truncate px-1 text-[11px] font-bold text-muted-foreground">
          {g.players
            .filter((id) => !g.gone.includes(id))
            .map((id) => `${name(id)} ${g.finished.includes(id) ? '✓' : g.hands[id]!.length}`)
            .join(' · ')}
        </p>
      </section>
    );

  return (
    <section
      ref={panel}
      className="panel flex max-h-full w-full flex-col gap-2 self-start overflow-y-auto p-2.5"
      style={{ maxWidth: 'min(920px, 100%)' }}
      aria-label="Slave"
    >
      <div className="flex items-center gap-2 px-1">
        <span className="text-sm font-black">🃏 Slave</span>
        <span className={cn('min-w-0 flex-1 truncate text-xs font-bold', myTurn || mySwap ? 'text-primary' : 'text-muted-foreground')}>
          {status}
        </span>
        {watching && (
          <button
            onClick={() => onMini?.(true)}
            aria-label="Shrink to the corner"
            className="grid size-8 place-items-center rounded-full hover:bg-muted"
          >
            <Minimize2 className="size-4" />
          </button>
        )}
      </div>
      {/* Whose turn it is and how long is left */}
      <div className="h-1 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-[width] duration-1000 ease-linear" style={{ width: `${left * 100}%` }} />
      </div>

      {/* The others around the table */}
      <div className="flex flex-wrap justify-center gap-1.5">
        {others.map((id) => {
          const place = g.finished.indexOf(id);
          const title = g.titles[id];
          return (
            <div
              key={id}
              className={cn(
                'flex items-center gap-1.5 rounded-full border bg-card/70 py-1 pr-2.5 pl-1 text-xs',
                g.stage === 'play' && g.turn === id && 'border-primary ring-2 ring-primary/40',
                g.gone.includes(id) && 'opacity-50',
              )}
            >
              <Face who={who(id)} size={24} />
              <span className="max-w-[90px] truncate font-extrabold">{name(id)}</span>
              {title && g.stage === 'swap' && <span title={TITLE[title].name}>{TITLE[title].emoji}</span>}
              <span className="font-bold text-muted-foreground">
                {g.gone.includes(id)
                  ? 'left'
                  : place >= 0
                    ? `out ${['1st', '2nd', '3rd', '4th', '5th'][place]}`
                    : g.passed.includes(id)
                      ? `🂠 ${g.hands[id]!.length} · passed`
                      : `🂠 ${g.hands[id]!.length}`}
              </span>
            </div>
          );
        })}
      </div>

      {/* The felt: the play to beat, or the swap */}
      <div className="grid min-h-[150px] place-items-center rounded-2xl bg-[radial-gradient(circle,#2f8a6a_0%,#1f6b52_100%)] p-3 text-center text-white">
        {g.stage === 'swap' ? (
          <div className="flex flex-col items-center gap-2">
            {mySwap ? (
              <>
                <p className="text-sm font-black">
                  {TITLE[g.titles[me]!].emoji} You’re {TITLE[g.titles[me]!].name}! {who(mySwap.to).name} gave you their best:
                </p>
                <div className="flex gap-1">
                  {mySwap.got.map((c) => (
                    <PlayingCard key={c} card={c} />
                  ))}
                </div>
                <p className="text-xs opacity-80">
                  Pick {mySwap.count} card{mySwap.count > 1 ? 's' : ''} from your hand to give back
                </p>
              </>
            ) : iGave ? (
              <p className="text-sm font-black">
                {TITLE[g.titles[me]!].emoji} You were {TITLE[g.titles[me]!].name}: your{' '}
                {iGave.count > 1 ? `${iGave.count} best cards` : 'best card'} went to {who(iGave.giver).name}. Waiting for cards back…
              </p>
            ) : (
              <p className="text-sm font-black">The King and Queen are swapping cards…</p>
            )}
          </div>
        ) : g.pile ? (
          <div className="flex flex-col items-center gap-2">
            <div className="flex gap-1">
              {g.pile.cards.map((c) => (
                <PlayingCard key={c} card={c} />
              ))}
            </div>
            <p className="text-xs font-bold opacity-85">
              {name(g.pile.by)} played {kind(g.pile.cards.length)}
            </p>
          </div>
        ) : (
          <p className="text-sm font-black opacity-90">{g.turn === me ? 'Your lead: play anything 🃏' : `${who(g.turn).name} leads`}</p>
        )}
      </div>

      {/* Your hand */}
      {!watching && hand.length > 0 && (
        <div className="flex items-end px-1 pt-3" role="group" aria-label="Your hand">
          {hand.map((c, k) => (
            // Each card gets an equal share of the width (up to its own): many cards overlap, few spread
            <div key={c} className={cn('min-w-0 flex-1', k === hand.length - 1 ? 'flex-none' : 'max-w-[62px]')}>
              <button
                onClick={() => toggle(c)}
                disabled={!myTurn && !mySwap}
                aria-pressed={picked.includes(c)}
                className={cn('block transition-transform', picked.includes(c) && '-translate-y-3')}
              >
                <PlayingCard card={c} picked={picked.includes(c)} />
              </button>
            </div>
          ))}
        </div>
      )}

      {!watching && (
        <div className="flex items-center gap-2">
          <Face who={who(me)} size={26} />
          <span className="text-sm font-extrabold">You</span>
          {g.titles[me] && g.stage === 'swap' && <span>{TITLE[g.titles[me]!].emoji}</span>}
          <span className="ml-auto flex gap-2">
            {mySwap ? (
              <button
                onClick={() => {
                  onGiveBack(picked);
                  setPicked([]);
                }}
                disabled={picked.length !== mySwap.count}
                className="rounded-full bg-primary px-5 py-2 text-sm font-extrabold text-primary-foreground disabled:opacity-40"
              >
                Give back {picked.length}/{mySwap.count}
              </button>
            ) : (
              <>
                <button
                  onClick={onPass}
                  disabled={!myTurn || !g.pile}
                  className="rounded-full border px-5 py-2 text-sm font-extrabold hover:bg-muted disabled:opacity-40"
                >
                  Pass
                </button>
                <button
                  onClick={() => {
                    onPlay(picked);
                    setPicked([]);
                  }}
                  disabled={!legal}
                  className="rounded-full bg-primary px-5 py-2 text-sm font-extrabold text-primary-foreground disabled:opacity-40"
                >
                  Play{picked.length > 1 ? ` ${picked.length}` : ''}
                </button>
              </>
            )}
          </span>
        </div>
      )}
    </section>
  );
}

/** A playing card in Connecta's style: cream, the rank and suit in a corner, a big suit in the middle. */
export function PlayingCard({ card, picked = false, small = false }: { card: Card; picked?: boolean; small?: boolean }) {
  const suit = SUITS[suitOf(card)];
  return (
    <span
      className={cn(
        'relative grid flex-none place-items-center rounded-lg border bg-[#fffaf2] shadow-sm',
        small ? 'h-[52px] w-[38px]' : 'h-[84px] w-[60px] max-sm:h-[70px] max-sm:w-[50px]',
        isRed(card) ? 'text-[#e0457b]' : 'text-[#3b2a33]',
        picked ? 'border-primary ring-2 ring-primary' : 'border-[#e8dccb]',
      )}
      aria-label={`${rankLabel(card)} of ${['clubs', 'diamonds', 'hearts', 'spades'][suitOf(card)]}`}
    >
      {small ? (
        // Too small for a corner: the rank over the suit, centred
        <span className="flex flex-col items-center text-sm leading-none font-black">
          {rankLabel(card)}
          <span className="text-base">{suit}</span>
        </span>
      ) : (
        <>
          <span className="absolute top-1 left-1.5 flex flex-col items-center text-[13px] leading-none font-black">
            {rankLabel(card)}
            <span className="text-[11px]">{suit}</span>
          </span>
          <span className="text-2xl">{suit}</span>
        </>
      )}
    </span>
  );
}
