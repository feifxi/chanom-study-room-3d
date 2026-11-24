import type { Deck, DeckKind, Question } from '@connecta/shared/pick-a-side';

/**
 * Pick a Side's question decks (docs/features/10-party-games.md). A deck is one topic; the game draws the questions.
 * - **Opinion** decks (Would you rather): two answers, no right one.
 * - **Quiz** decks: four answers, one right.
 * Decks are built in or the room's own (written by its members); AI decks come with Plus later. The
 * rules and the built-in decks live in packages/shared.
 */

export { BUILT_IN, deckKindFor, type Deck, type DeckKind, type Question } from '@connecta/shared/pick-a-side';

/** A room deck as the Deck picker lists it */
export interface ShelfDeck extends Deck {
  /** Who wrote it */
  by: string | null;
  /** You may change it */
  mine: boolean;
  canDelete: boolean;
}

/** What you write in the deck editor */
export interface DeckDraft {
  id?: string;
  name: string;
  kind: DeckKind;
  questions: Question[];
}

/** Where the Deck picker's "This room" tab reads and writes (the API) */
export interface DeckShelf {
  decks: ShelfDeck[];
  /** Members add decks; guests only play with them */
  canAdd: boolean;
  save(draft: DeckDraft): Promise<Deck | null>;
  remove(id: string): Promise<void>;
}
