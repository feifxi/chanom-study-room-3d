import { Chess, type PieceSymbol, type Square } from 'chess.js';

/**
 * Chess at the chess table (feature 12): two players, casual, no clock. The rules (legal moves,
 * check, mate, castling, en passant, promotion, the automatic draws) come from chess.js; this file
 * keeps the game's state in a plain, serialisable shape, the way the server will send it.
 */

export type EndReason = 'checkmate' | 'stalemate' | 'repetition' | 'fifty' | 'material' | 'agreed' | 'resigned' | 'left';

export interface ChessGame {
  white: string;
  black: string;
  /** Every move so far (SAN). The position is replayed from these, so repetition draws work. */
  moves: string[];
  fen: string;
  last: { from: Square; to: Square } | null;
  /** Pieces each side has taken (white's captures are black pieces). */
  taken: { w: PieceSymbol[]; b: PieceSymbol[] };
  /** Who offered a draw, until the other answers or a move is made. */
  drawOffer: string | null;
  end: { winner: string | null; why: EndReason } | null;
  /** Bumps on every change (the hub compares it instead of the whole game). */
  rev: number;
}

export const PIECE_VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

const engines = new WeakMap<ChessGame, Chess>();
/** The rules engine for a game, built once and kept in step with its moves. */
export function engine(g: ChessGame) {
  let c = engines.get(g);
  if (!c) {
    c = new Chess();
    for (const m of g.moves) c.move(m);
    engines.set(g, c);
  }
  return c;
}

/** A new game between two players. A rematch between the same two swaps colours; otherwise it's random. */
export function newChess(a: string, b: string, last?: { white: string; black: string }): ChessGame {
  const same = last && [last.white, last.black].includes(a) && [last.white, last.black].includes(b);
  const [white, black] = same ? [last!.black, last!.white] : Math.random() < 0.5 ? [a, b] : [b, a];
  return { white, black, moves: [], fen: new Chess().fen(), last: null, taken: { w: [], b: [] }, drawOffer: null, end: null, rev: 0 };
}

export const colorOf = (g: ChessGame, id: string) => (id === g.white ? 'w' : id === g.black ? 'b' : null);
export const turnOf = (g: ChessGame) => (engine(g).turn() === 'w' ? g.white : g.black);

/** Plays a move if it's legal and it's their turn; returns whether it was played. */
export function play(g: ChessGame, id: string, from: Square, to: Square, promotion?: PieceSymbol) {
  const c = engine(g);
  if (g.end || turnOf(g) !== id) return false;
  let move;
  try {
    move = c.move({ from, to, promotion: promotion ?? 'q' });
  } catch {
    return false; // illegal
  }
  g.moves.push(move.san);
  g.fen = c.fen();
  g.last = { from: move.from, to: move.to };
  if (move.captured) g.taken[move.color].push(move.captured);
  g.drawOffer = null;
  g.end = autoEnd(g);
  g.rev++;
  return true;
}

/** How the position itself ends the game, if it does. */
function autoEnd(g: ChessGame): ChessGame['end'] {
  const c = engine(g);
  if (c.isCheckmate()) return { winner: c.turn() === 'w' ? g.black : g.white, why: 'checkmate' };
  if (c.isStalemate()) return { winner: null, why: 'stalemate' };
  if (c.isInsufficientMaterial()) return { winner: null, why: 'material' };
  if (c.isThreefoldRepetition()) return { winner: null, why: 'repetition' };
  if (c.isDraw()) return { winner: null, why: 'fifty' };
  return null;
}

export function resign(g: ChessGame, id: string) {
  if (g.end || !colorOf(g, id)) return;
  g.end = { winner: id === g.white ? g.black : g.white, why: 'resigned' };
  g.rev++;
}

/** One player gone mid-game (left, or away for 30 s): the other wins. */
export function forfeit(g: ChessGame, id: string) {
  if (g.end || !colorOf(g, id)) return;
  g.end = { winner: id === g.white ? g.black : g.white, why: 'left' };
  g.rev++;
}

export function offerDraw(g: ChessGame, id: string) {
  if (g.end || !colorOf(g, id) || g.drawOffer) return;
  g.drawOffer = id;
  g.rev++;
}

export function answerDraw(g: ChessGame, id: string, accept: boolean) {
  if (g.end || !g.drawOffer || g.drawOffer === id || !colorOf(g, id)) return;
  if (accept) g.end = { winner: null, why: 'agreed' };
  g.drawOffer = null;
  g.rev++;
}

/** Demo: a friendly, beatable opponent. Mates when it can, likes captures and checks, otherwise anything. */
export function friendlyMove(g: ChessGame) {
  const c = engine(g);
  const moves = c.moves({ verbose: true });
  let best = moves[0];
  let bestScore = -Infinity;
  for (const m of moves) {
    let score = Math.random() * 2;
    if (m.san.includes('#')) score += 100;
    if (m.captured) score += PIECE_VALUE[m.captured] * 1.5;
    if (m.san.includes('+')) score += 1;
    if (m.promotion) score += 6;
    if (score > bestScore) [best, bestScore] = [m, score];
  }
  return best ? { from: best.from, to: best.to, promotion: best.promotion } : null;
}

export const END_TEXT: Record<EndReason, string> = {
  checkmate: 'by checkmate',
  resigned: 'by resignation',
  left: 'the other player left',
  stalemate: 'Stalemate',
  repetition: 'Draw by repetition',
  fifty: 'Draw by the 50-move rule',
  material: 'Draw: not enough pieces to mate',
  agreed: 'Draw agreed',
};
