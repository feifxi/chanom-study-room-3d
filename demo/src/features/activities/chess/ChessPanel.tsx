'use client';

import { useMemo, useRef, useState } from 'react';
import { Flag, Handshake, Maximize2, Minimize2 } from 'lucide-react';
import type { Color, PieceSymbol, Square } from 'chess.js';
import { cn } from '@/lib/utils';
import { useDismiss } from '../../room/useDismiss';
import { Face, type Who } from '../ActivityHud';
import { PIECE_VALUE, colorOf, engine, turnOf, type ChessGame } from './game';
import { Piece } from './Pieces';

const FILES = 'abcdefgh';
const LIGHT = '#fbeedd';
const DARK = '#c99a7d';

/**
 * Chess up close (feature 12). Players get the big board in the theater: tap a piece, then one of
 * its dots (or drag it there); the board turns so your colour is at the bottom. People standing by
 * the table watch: a small read-only board in the corner, a click makes it big.
 */
export function ChessPanel({
  game: g,
  me = 'me',
  who,
  mini = false,
  onMini,
  onMove,
  onResign,
  onOfferDraw,
  onAnswerDraw,
}: {
  game: ChessGame;
  me?: string;
  who: (id: string) => Who;
  /** Watchers only: the small board in the corner. */
  mini?: boolean;
  onMini?: (mini: boolean) => void;
  onMove: (from: Square, to: Square, promotion?: PieceSymbol) => void;
  onResign: () => void;
  onOfferDraw: () => void;
  onAnswerDraw: (accept: boolean) => void;
}) {
  const mine = colorOf(g, me);
  const watching = !mine;
  const panel = useDismiss<HTMLElement>(watching && !mini, () => onMini?.(true));
  const c = engine(g);
  const myTurn = !!mine && !g.end && turnOf(g) === me;
  const [selected, setSelected] = useState<Square | null>(null);
  const [promoting, setPromoting] = useState<{ from: Square; to: Square } | null>(null);
  const [confirmResign, setConfirmResign] = useState(false);
  const dragging = useRef(false);

  // The game moved on (a move, or a new game): forget a stale selection
  const [seenRev, setSeenRev] = useState(g.rev);
  if (seenRev !== g.rev) {
    setSeenRev(g.rev);
    setSelected(null);
    setPromoting(null);
  }

  const targets = useMemo(
    () => (selected && myTurn ? new Set(c.moves({ square: selected, verbose: true }).map((m) => m.to)) : new Set<string>()),
    // g.rev: the engine changes in place
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selected, myTurn, g.rev],
  );
  const checkSquare = c.inCheck()
    ? (c
        .board()
        .flat()
        .find((p) => p?.type === 'k' && p.color === c.turn())?.square ?? null)
    : null;

  const ownPiece = (sq: Square) => c.get(sq)?.color === mine;
  const tryMove = (from: Square, to: Square) => {
    if (!targets.has(to)) return false;
    const piece = c.get(from);
    if (piece?.type === 'p' && (to[1] === '8' || to[1] === '1')) setPromoting({ from, to });
    else onMove(from, to);
    setSelected(null);
    return true;
  };
  const down = (sq: Square) => {
    if (!myTurn || promoting) return;
    if (selected && sq !== selected && tryMove(selected, sq)) return;
    if (ownPiece(sq)) {
      setSelected(sq === selected ? null : sq);
      dragging.current = true;
    } else setSelected(null);
  };
  // Dropped somewhere else after a drag: move there if it's legal
  const up = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    dragging.current = false;
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-sq]');
    const sq = el?.getAttribute('data-sq') as Square | null;
    if (selected && sq && sq !== selected) tryMove(selected, sq);
  };

  // White at the bottom unless you're black
  const flip = mine === 'b';
  const ranks = flip ? [1, 2, 3, 4, 5, 6, 7, 8] : [8, 7, 6, 5, 4, 3, 2, 1];
  const files = flip ? [...FILES].reverse() : [...FILES];
  const top = flip ? g.white : g.black;
  const bottom = flip ? g.black : g.white;
  const turnName = turnOf(g) === me ? 'Your move' : `${who(turnOf(g)).name} is thinking…`;

  const board = (
    <div
      className="grid aspect-square w-full touch-none grid-cols-8 overflow-hidden rounded-xl border-2 border-[#8a6244] select-none"
      onPointerUp={up}
      onPointerCancel={() => (dragging.current = false)}
      role="grid"
      aria-label="Chess board"
    >
      {ranks.map((r, ri) =>
        files.map((f, fi) => {
          const sq = `${f}${r}` as Square;
          const p = c.get(sq);
          const dark = (FILES.indexOf(f) + r) % 2 === 0;
          const last = g.last && (g.last.from === sq || g.last.to === sq);
          const target = targets.has(sq);
          return (
            <div
              key={sq}
              data-sq={sq}
              onPointerDown={mini ? undefined : () => down(sq)}
              className={cn('relative grid aspect-square place-items-center', myTurn && (ownPiece(sq) || target) && 'cursor-pointer')}
              style={{ background: dark ? DARK : LIGHT }}
              role="gridcell"
              aria-label={`${sq}${p ? `, ${p.color === 'w' ? 'white' : 'black'} ${p.type}` : ''}`}
            >
              {last && <span className="absolute inset-0 bg-[#ffd36e]/45" />}
              {selected === sq && <span className="absolute inset-0 bg-primary/40" />}
              {checkSquare === sq && <span className="absolute inset-0 bg-[radial-gradient(circle,#ff4d6d_0%,transparent_70%)]" />}
              {p && <Piece type={p.type} color={p.color} className="relative size-[88%] drop-shadow-sm" />}
              {target && (
                <span
                  className={cn(
                    'pointer-events-none absolute rounded-full',
                    p ? 'inset-[6%] border-[3px] border-primary/70' : 'size-[28%] bg-primary/55',
                  )}
                />
              )}
              {/* Coordinates along the left and bottom edges, small, in the other square colour */}
              {!mini && fi === 0 && (
                <span className="absolute top-0.5 left-1 text-[9px] font-black" style={{ color: dark ? LIGHT : DARK }}>
                  {r}
                </span>
              )}
              {!mini && ri === 7 && (
                <span className="absolute right-1 bottom-0 text-[9px] font-black" style={{ color: dark ? LIGHT : DARK }}>
                  {f}
                </span>
              )}
            </div>
          );
        }),
      )}
    </div>
  );

  if (mini)
    return (
      <section ref={panel} className="panel flex w-[240px] flex-col gap-1.5 p-2" aria-label="Chess">
        <div className="flex items-center gap-2 px-1">
          <span className="min-w-0 flex-1 truncate text-xs font-black">
            ♟️ {who(g.white).name} vs {who(g.black).name}
          </span>
          <button
            onClick={() => onMini?.(false)}
            aria-label="Make it bigger"
            className="grid size-7 place-items-center rounded-full hover:bg-muted"
          >
            <Maximize2 className="size-3.5" />
          </button>
        </div>
        <button onClick={() => onMini?.(false)} aria-label="Make it bigger" className="block">
          {board}
        </button>
      </section>
    );

  return (
    <section
      ref={panel}
      className="panel flex max-h-full w-full flex-col gap-2 self-start overflow-y-auto p-2.5"
      // As big as the stage allows while the whole board fits its height (the stage less the panel's
      // header, the two player rows and padding)
      style={{ maxWidth: 'min(720px, calc(100dvh - 310px))', minWidth: 'min(320px, 100%)' }}
      aria-label="Chess"
    >
      <div className="flex items-center gap-2 px-1">
        <span className="text-sm font-black">♟️ Chess</span>
        <span className={cn('min-w-0 flex-1 truncate text-xs font-bold', myTurn ? 'text-primary' : 'text-muted-foreground')}>
          {g.end ? 'Game over' : turnName}
          {!g.end && c.inCheck() && ' · Check!'}
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

      <PlayerRow g={g} id={top} who={who} me={me} />
      <div className="relative">
        {board}
        {promoting && (
          <div className="absolute inset-0 grid place-items-center bg-black/30">
            <div className="panel flex flex-col items-center gap-2 p-3">
              <p className="text-xs font-black">Promote to</p>
              <div className="flex gap-1">
                {(['q', 'r', 'b', 'n'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      onMove(promoting.from, promoting.to, t);
                      setPromoting(null);
                    }}
                    className="grid size-14 place-items-center rounded-xl hover:bg-muted"
                  >
                    <Piece type={t} color={mine as Color} className="size-12" />
                  </button>
                ))}
              </div>
              <button onClick={() => setPromoting(null)} className="text-xs text-muted-foreground hover:text-foreground">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
      <PlayerRow g={g} id={bottom} who={who} me={me} />

      {!watching && !g.end && (
        <div className="flex items-center gap-2">
          {g.drawOffer && g.drawOffer !== me ? (
            <div className="flex flex-1 items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-bold">
              <span className="flex-1">🤝 {who(g.drawOffer).name} offers a draw</span>
              <button onClick={() => onAnswerDraw(true)} className="rounded-full bg-primary px-3 py-1 text-primary-foreground">
                Accept
              </button>
              <button onClick={() => onAnswerDraw(false)} className="rounded-full px-3 py-1 hover:bg-card">
                Decline
              </button>
            </div>
          ) : confirmResign ? (
            <div className="flex flex-1 items-center gap-2 rounded-full bg-destructive/10 px-3 py-1 text-xs font-bold">
              <span className="flex-1">Resign this game?</span>
              <button
                onClick={() => {
                  setConfirmResign(false);
                  onResign();
                }}
                className="rounded-full bg-destructive px-3 py-1 text-white"
              >
                Resign
              </button>
              <button onClick={() => setConfirmResign(false)} className="rounded-full px-3 py-1 hover:bg-card">
                Keep playing
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={onOfferDraw}
                disabled={g.drawOffer === me}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold hover:bg-muted disabled:opacity-60"
              >
                <Handshake className="size-4" /> {g.drawOffer === me ? 'Draw offered…' : 'Offer a draw'}
              </button>
              <button
                onClick={() => setConfirmResign(true)}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold hover:bg-muted"
              >
                <Flag className="size-4" /> Resign
              </button>
            </>
          )}
        </div>
      )}
    </section>
  );
}

/** A player above or below the board: their face, name, colour, and the pieces they've taken. */
function PlayerRow({ g, id, who, me }: { g: ChessGame; id: string; who: (id: string) => Who; me: string }) {
  const color = colorOf(g, id)!;
  const taken = [...g.taken[color]].sort((a, b) => PIECE_VALUE[b] - PIECE_VALUE[a]);
  const score = (side: Color) => g.taken[side].reduce((n, p) => n + PIECE_VALUE[p], 0);
  const ahead = score(color) - score(color === 'w' ? 'b' : 'w');
  const toMove = !g.end && turnOf(g) === id;
  return (
    <div className={cn('flex items-center gap-2 rounded-xl px-1.5 py-1', toMove && 'bg-secondary')}>
      <Face who={who(id)} size={26} />
      <span className="truncate text-sm font-extrabold">
        {who(id).name}
        {id === me && ' (you)'}
      </span>
      <span className="text-[11px] font-bold text-muted-foreground">{color === 'w' ? 'White' : 'Black'}</span>
      <span className="ml-auto flex min-w-0 items-center">
        {taken.map((t, i) => (
          <Piece key={i} type={t} color={color === 'w' ? 'b' : 'w'} className="-ml-1.5 size-5 first:ml-0" />
        ))}
        {ahead > 0 && <span className="ml-1 text-[11px] font-black text-muted-foreground">+{ahead}</span>}
      </span>
    </div>
  );
}
