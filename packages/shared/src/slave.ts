/**
 * Slave (ไพ่สลาฟ) at the card table (docs/features/11-table-games.md), Thai rules kept simple:
 *
 * - 3 is lowest, 2 highest; suits ♣ < ♦ < ♥ < ♠. One deck, dealt out evenly (with 5 or 6 players
 *   some hold one more card).
 * - Play a single, pair, triple or four of a kind; the next play must be the same number of cards and
 *   beat it (compared by its highest card). Pass and you sit out the rest of that trick. When
 *   everyone else has passed, the last player leads anything.
 * - The 3♣ leads the first game. Finishing order gives titles (King, Queen, Commoners, Slave); in the
 *   next game the Slave gives the King their 2 best cards and the King gives 2 back (Queen and the
 *   next-to-last swap 1), and the Slave leads. No straights, bombs or revolution.
 *
 * Plain, serialisable state. The game server plays it (`apps/game/src/slave.ts`).
 */

/** A card is 0–51: rank × 4 + suit, so a bigger number is a better card. */
export type Card = number;
export const rankOf = (c: Card) => Math.floor(c / 4);
export const suitOf = (c: Card) => c % 4;
const RANKS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
export const SUITS = ['♣', '♦', '♥', '♠'];
export const rankLabel = (c: Card) => RANKS[rankOf(c)]!;
export const isRed = (c: Card) => suitOf(c) === 1 || suitOf(c) === 2;
const THREE_OF_CLUBS = 0;

export type Title = 'king' | 'queen' | 'commoner' | 'slave';
export const TITLE: Record<Title, { name: string; emoji: string }> = {
  king: { name: 'King', emoji: '👑' },
  queen: { name: 'Queen', emoji: '💎' },
  commoner: { name: 'Commoner', emoji: '🙂' },
  slave: { name: 'Slave', emoji: '🧹' },
};

export interface Play {
  by: string;
  cards: Card[];
}

export interface SlaveGame {
  /** Around the table, in seat order: turns go this way. */
  players: string[];
  hands: Record<string, Card[]>;
  /** The play to beat this trick (null: whoever's turn it is leads anything). */
  pile: Play | null;
  /** Passed this trick. */
  passed: string[];
  turn: string;
  /** When the current turn runs out. */
  until: number;
  /** Out of cards (or gone), first out first. */
  finished: string[];
  /** Left mid-game: they place last, below whoever finished. */
  gone: string[];
  /** Titles from the game before (shown during the swap), and this game's once it ends. */
  titles: Record<string, Title>;
  /** The swap before a game: who gives back what, and what they got. */
  swap: { giver: string; to: string; count: number; got: Card[] }[];
  stage: 'swap' | 'play' | 'done';
  rev: number;
}

export const SWAP_MS = 20_000;
export const turnMs = (players: number) => (players >= 5 ? 15_000 : 20_000);
const sortHand = (h: Card[]) => h.sort((a, b) => a - b);

function shuffledDeck() {
  const d = Array.from({ length: 52 }, (_, i) => i);
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j]!, d[i]!];
  }
  return d;
}

/** Titles by finishing order: first is King, second Queen (4 or more players), last Slave, the rest Commoners. */
export function titlesFor(order: string[]): Record<string, Title> {
  const n = order.length;
  return Object.fromEntries(
    order.map((id, i) => [id, i === 0 ? 'king' : i === n - 1 ? 'slave' : i === 1 && n >= 4 ? 'queen' : 'commoner'] as const),
  );
}

/**
 * Deal a new game. With titles from the last game (same players), the swap happens first: the
 * losers' best cards go up at once, and the winners pick what to send back.
 */
export function newSlave(players: string[], now: number, last?: Record<string, Title>): SlaveGame {
  const deck = shuffledDeck();
  const hands: Record<string, Card[]> = Object.fromEntries(players.map((id) => [id, [] as Card[]]));
  deck.forEach((c, i) => hands[players[i % players.length]!]!.push(c));
  players.forEach((id) => sortHand(hands[id]!));
  const titled = !!last && players.every((id) => last[id]);
  const g: SlaveGame = {
    players,
    hands,
    pile: null,
    passed: [],
    turn: players.find((id) => hands[id]!.includes(THREE_OF_CLUBS)) ?? players[0]!,
    until: now + turnMs(players.length),
    finished: [],
    gone: [],
    titles: titled ? { ...last! } : {},
    swap: [],
    stage: 'play',
    rev: 0,
  };
  if (!titled) return g;
  const by = (t: Title) => players.filter((id) => last![id] === t);
  const slave = by('slave')[0]!;
  const king = by('king')[0]!;
  const queen = by('queen')[0];
  // The next-to-last: the Commoner who finished just above the Slave
  const order = Object.keys(last!).filter((id) => players.includes(id));
  const vice = queen ? order[order.indexOf(slave) - 1] : undefined;
  const pairs: [string, string, number][] = [[slave, king, 2]];
  if (queen && vice && vice !== queen) pairs.push([vice, queen, 1]);
  for (const [loser, winner, count] of pairs) {
    const best = hands[loser]!.splice(-count, count);
    hands[winner]!.push(...best);
    sortHand(hands[winner]!);
    g.swap.push({ giver: winner, to: loser, count, got: best });
  }
  g.stage = 'swap';
  g.turn = slave;
  g.until = now + SWAP_MS;
  return g;
}

/** A winner sends cards back during the swap. Done when everyone has; the Slave leads. */
export function giveBack(g: SlaveGame, id: string, cards: Card[], now: number) {
  const s = g.swap.find((x) => x.giver === id);
  if (g.stage !== 'swap' || !s || cards.length !== s.count || !cards.every((c) => g.hands[id]!.includes(c))) return false;
  g.hands[id] = g.hands[id]!.filter((c) => !cards.includes(c));
  g.hands[s.to]!.push(...cards);
  sortHand(g.hands[s.to]!);
  g.swap = g.swap.filter((x) => x !== s);
  if (!g.swap.length) startPlay(g, now);
  g.rev++;
  return true;
}

/** The swap is over: the Slave leads (or, if they've gone, the next player). */
function startPlay(g: SlaveGame, now: number) {
  Object.assign(g, { stage: 'play', until: now + turnMs(g.players.length) });
  if (!active(g).includes(g.turn)) g.turn = nextAfter(g, g.turn) ?? g.players[0]!;
}

/** Swap time ran out: winners who haven't chosen send back their lowest cards. */
export function swapTimeout(g: SlaveGame, now: number) {
  for (const s of [...g.swap]) giveBack(g, s.giver, g.hands[s.giver]!.slice(0, s.count), now);
}

/** Whether these cards make a legal play now: one rank, 1–4 cards, beating the pile. */
export function canPlay(g: SlaveGame, cards: Card[]) {
  if (!cards.length || cards.length > 4) return false;
  if (!cards.every((c) => rankOf(c) === rankOf(cards[0]!))) return false;
  if (!g.pile) return true;
  return cards.length === g.pile.cards.length && Math.max(...cards) > Math.max(...g.pile.cards);
}

const active = (g: SlaveGame) => g.players.filter((id) => !g.finished.includes(id) && !g.gone.includes(id));

/** The next player after `from` who's still in this trick. */
function nextAfter(g: SlaveGame, from: string) {
  const n = g.players.length;
  const i = g.players.indexOf(from);
  for (let k = 1; k <= n; k++) {
    const id = g.players[(i + k) % n]!;
    if (active(g).includes(id) && !g.passed.includes(id)) return id;
  }
  return null;
}

/** Moves the turn on; clears the trick when everyone else has passed. */
function advance(g: SlaveGame, from: string, now: number) {
  const left = active(g);
  if (left.length <= 1) return end(g);
  const stillIn = left.filter((id) => !g.passed.includes(id));
  const lastBy = g.pile?.by;
  // Everyone but the last player passed (or the last player went out): a fresh trick
  if (g.pile && (stillIn.length === 0 || (stillIn.length === 1 && stillIn[0] === lastBy))) {
    const leader = left.includes(lastBy!) ? lastBy! : (nextAfterFinished(g, lastBy!) ?? left[0]!);
    Object.assign(g, { pile: null, passed: [], turn: leader });
  } else g.turn = nextAfter(g, from) ?? left[0]!;
  g.until = now + turnMs(g.players.length);
}

/** When the last player to play has gone out, the next one still in leads. */
function nextAfterFinished(g: SlaveGame, from: string) {
  g.passed = [];
  return nextAfter(g, from);
}

function end(g: SlaveGame) {
  const last = active(g);
  // The last one holding cards is below everyone who went out; anyone who left is below them
  const order = [...g.finished, ...last, ...[...g.gone].reverse()];
  g.finished = order;
  g.titles = titlesFor(order);
  g.stage = 'done';
}

export function play(g: SlaveGame, id: string, cards: Card[], now: number) {
  if (g.stage !== 'play' || g.turn !== id || !cards.every((c) => g.hands[id]!.includes(c)) || !canPlay(g, cards)) return false;
  g.hands[id] = g.hands[id]!.filter((c) => !cards.includes(c));
  g.pile = { by: id, cards: [...cards].sort((a, b) => a - b) };
  if (!g.hands[id]!.length) g.finished.push(id);
  advance(g, id, now);
  g.rev++;
  return true;
}

export function pass(g: SlaveGame, id: string, now: number) {
  // Leading, you have to play something
  if (g.stage !== 'play' || g.turn !== id || !g.pile) return false;
  g.passed.push(id);
  advance(g, id, now);
  g.rev++;
  return true;
}

/** Time's up: pass, or when leading, play the lowest card. */
export function timeout(g: SlaveGame, now: number) {
  if (g.stage === 'swap') return swapTimeout(g, now);
  if (g.stage !== 'play') return;
  const id = g.turn;
  if (g.pile) pass(g, id, now);
  else play(g, id, [g.hands[id]![0]!], now);
}

/** Someone left or was away 30 s: out as last, their cards gone, the others play on. */
export function drop(g: SlaveGame, id: string, now: number) {
  if (g.stage === 'done' || !g.players.includes(id) || g.gone.includes(id) || g.finished.includes(id)) return;
  g.gone.push(id);
  g.hands[id] = [];
  g.swap = g.swap.filter((s) => s.giver !== id && s.to !== id);
  if (active(g).length <= 1) end(g);
  else if (g.stage === 'swap' && !g.swap.length) startPlay(g, now);
  else if (g.stage === 'play' && g.turn === id) advance(g, id, now);
  g.rev++;
}
