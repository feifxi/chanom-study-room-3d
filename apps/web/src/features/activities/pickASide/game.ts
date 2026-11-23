import { newGame as fresh, type Deck, type SideGame, type SideMode } from '@connecta/shared/pick-a-side';

// The rules live in packages/shared, so the game server plays the same game
export * from '@connecta/shared/pick-a-side';

/** The demo remembers what it has played for the visit (the game server keeps it per room) */
const PLAYED = new Map<string, Set<string>>();

export function newGame(mode: SideMode, deck: Deck, now: number, solo = false): SideGame {
  const played = PLAYED.get(deck.id) ?? new Set<string>();
  PLAYED.set(deck.id, played);
  return fresh(mode, deck, now, solo, played);
}
