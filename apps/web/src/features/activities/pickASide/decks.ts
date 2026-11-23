import { useSyncExternalStore } from 'react';
import { ME } from '@/lib/mock';
import { BUILT_IN, type Deck, type DeckKind, type Question } from '@connecta/shared/pick-a-side';

/**
 * Pick a Side's question decks (feature 11). A deck is one topic; the game draws the questions.
 * - **Opinion** decks (Would you rather): two answers, no right one.
 * - **Quiz** decks: four answers, one right.
 * Decks come from three places: built in, the room's own (written by its members), or made by AI
 * (after Plus; the demo only). The rules and the built-in decks live in packages/shared.
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

/** Where the Deck picker's "This room" tab reads and writes (the API in a real room, this browser in the demo) */
export interface DeckShelf {
  decks: ShelfDeck[];
  /** Members add decks; guests only play with them */
  canAdd: boolean;
  /** The ✨ AI tab (the demo; the real one comes after Plus) */
  ai: boolean;
  save(draft: DeckDraft): Promise<Deck | null>;
  remove(id: string): Promise<void>;
}

// --- The demo's room decks: kept in this browser ---

const MINE_KEY = 'connecta:my-decks';
const listeners = new Set<() => void>();
let mineCache: Deck[] | null = null;

function readMine(): Deck[] {
  if (mineCache) return mineCache;
  try {
    mineCache = JSON.parse(localStorage.getItem(MINE_KEY) ?? '[]') as Deck[];
  } catch {
    mineCache = [];
  }
  return mineCache;
}

function writeMine(decks: Deck[]) {
  mineCache = decks;
  try {
    localStorage.setItem(MINE_KEY, JSON.stringify(decks));
  } catch {
    // Kept for this visit only
  }
  listeners.forEach((l) => l());
}

const EMPTY: Deck[] = [];
export function useMyDecks() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    readMine,
    () => EMPTY,
  );
}

export function saveDeck(deck: Deck) {
  const mine = readMine();
  const i = mine.findIndex((d) => d.id === deck.id);
  writeMine(i >= 0 ? mine.map((d) => (d.id === deck.id ? deck : d)) : [...mine, { ...deck, source: 'room' }]);
}

export function deleteDeck(id: string) {
  writeMine(readMine().filter((d) => d.id !== id));
}

/** The demo's shelf: decks in this browser, written by "you" */
export function useLocalShelf(): DeckShelf {
  const decks = useMyDecks();
  return {
    decks: decks.map((d) => ({ ...d, by: ME.name, mine: true, canDelete: true })),
    canAdd: true,
    ai: true,
    save: async (draft) => {
      const deck: Deck = {
        id: draft.id ?? `mine-${Date.now()}`,
        name: draft.name,
        emoji: draft.kind === 'quiz' ? '📝' : '💬',
        kind: draft.kind,
        source: 'room',
        questions: draft.questions,
      };
      saveDeck(deck);
      return deck;
    },
    remove: async (id) => deleteDeck(id),
  };
}

// --- AI decks: a few a day on Free, plenty with Plus (AI calls cost money) ---

export const AI_PER_DAY = ME.plus ? 30 : 3;
const AI_KEY = 'connecta:ai-decks';

export function aiUsedToday(): number {
  try {
    const v = JSON.parse(localStorage.getItem(AI_KEY) ?? '{}') as { day?: string; n?: number };
    return v.day === new Date().toDateString() ? (v.n ?? 0) : 0;
  } catch {
    return 0;
  }
}

/**
 * Demo stand-in for the AI: the real one writes 15 questions about the topic. Here a sample deck is
 * dressed up with the topic's name.
 */
export async function makeAiDeck(topic: string, kind: DeckKind): Promise<Deck> {
  await new Promise((r) => setTimeout(r, 1200));
  try {
    localStorage.setItem(AI_KEY, JSON.stringify({ day: new Date().toDateString(), n: aiUsedToday() + 1 }));
  } catch {
    // Not counted, that's all
  }
  const pool = BUILT_IN.filter((d) => d.kind === kind).flatMap((d) => d.questions);
  const picked = [...pool].sort(() => Math.random() - 0.5).slice(0, 15);
  const id = `ai-${Date.now()}`;
  return {
    id,
    name: topic.trim().slice(0, 40),
    emoji: '✨',
    kind,
    source: 'ai',
    questions: picked.map((q, i) => ({ ...q, id: `${id}-${i}` })),
  };
}
