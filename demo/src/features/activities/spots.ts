import { activeMap } from '../map/active';
import { artSeats, cardSeats, rect, type Area } from '../map/types';

/**
 * Activity spots: the places in a map where activities happen (standard kit, feature 7). Every
 * activity follows the same flow (feature 9): Free → Gathering → Playing → Results. Where they are
 * comes from the map the room is in (`features/map/*.ts`, read through getters); this file says what
 * happens there.
 */

export { isGameSeat } from '../map/types';
export type { Area } from '../map/types';

export type SpotId = 'cards' | 'chess' | 'floor' | 'tv' | 'board' | 'art';

export interface Game {
  id: string;
  name: string;
  emoji: string;
  min: number;
  max: number;
  /** One line under the game's name when the name alone could mislead. */
  blurb?: string;
}

export interface Spot {
  id: SpotId;
  /** The place in the map ("Card table"). */
  name: string;
  /** What you do there, the name people look for in the Activities list ("Card games"). */
  activity: string;
  /** A free zone, like the Buddy Machine: not an activity, so not in the list (the whiteboard). */
  freeZone?: boolean;
  emoji: string;
  /** Rounds: newcomers join next round. Drop-in: step in any time. */
  kind: 'rounds' | 'drop-in';
  /** Sends an invite to everyone when called, and is off when the room turns room-wide games off. */
  roomWide: boolean;
  games: Game[];
  /** Being here is being in: seats for seated spots, otherwise standing on the rug. */
  area: Area;
  seats?: string[];
  /** Built in the demo's map; the rest arrive with their features. */
  built: boolean;
  /** Not every map has every spot yet (the chess table is the Library's for now): absent spots are unlisted. */
  inMap?: boolean;
  feature: number;
  tint: string;
}

export const SPOTS: Spot[] = [
  {
    id: 'cards',
    name: 'Card table',
    activity: 'Card games',
    emoji: '🃏',
    kind: 'rounds',
    roomWide: false,
    games: [
      // Up to the table's stools: the Library's card table seats 6, the Café's and Rooftop's 4 for now
      { id: 'slave', name: 'Slave', emoji: '🃏', min: 3, max: 6 },
      { id: 'uno', name: 'Color Cards', emoji: '🎴', min: 2, max: 6 },
    ],
    // The first card table (the Café and Rooftop still have a second, its stools plain seats)
    get area() {
      return activeMap().cardTables[0]!.area;
    },
    get seats() {
      return cardSeats(activeMap().cardTables[0]!).map((s) => s.id);
    },
    built: true,
    feature: 12,
    tint: 'bg-mint',
  },
  {
    id: 'chess',
    name: 'Chess table',
    activity: 'Chess',
    emoji: '♟️',
    kind: 'rounds',
    roomWide: false,
    // The game for a pair: everyone else at the table watches
    games: [{ id: 'chess', name: 'Chess', emoji: '♟️', min: 2, max: 2 }],
    // Maps without a chess table get an area nobody can stand in (off the map), and no listing
    get area() {
      return activeMap().chessTable?.area ?? rect(1e4, 1e4, 0, 0);
    },
    get seats() {
      const t = activeMap().chessTable;
      return t ? cardSeats(t).map((s) => s.id) : undefined;
    },
    get built() {
      return !!activeMap().chessTable;
    },
    get inMap() {
      return !!activeMap().chessTable;
    },
    feature: 12,
    tint: 'bg-sky',
  },

  {
    id: 'floor',
    name: 'Open floor',
    activity: 'Pick a Side',
    emoji: '🗳️',
    kind: 'rounds',
    roomWide: true,
    games: [
      { id: 'wyr', name: 'Would you rather', emoji: '🤔', min: 1, max: 50 },
      { id: 'quiz', name: 'Quiz', emoji: '🧠', min: 1, max: 50 },
    ],
    // The four-colour rug: one quarter per zone, eight to ten people in each
    get area() {
      return activeMap().floorArea;
    },
    built: true,
    feature: 11,
    tint: 'bg-secondary',
  },
  {
    id: 'tv',
    name: 'Big screen',
    activity: 'Watch together',
    emoji: '📺',
    kind: 'drop-in',
    roomWide: false,
    games: [{ id: 'watch', name: 'Watch together', emoji: '📺', min: 1, max: 100 }],
    get area() {
      return activeMap().tvArea;
    },
    built: true,
    feature: 10,
    tint: 'bg-sky',
  },
  {
    id: 'board',
    name: 'Whiteboard',
    activity: 'Whiteboard',
    freeZone: true,
    emoji: '🎨',
    kind: 'drop-in',
    roomWide: false,
    games: [{ id: 'board', name: 'Whiteboard', emoji: '🎨', min: 1, max: 12 }],
    get area() {
      return activeMap().boardArea;
    },
    built: true,
    feature: 11,
    tint: 'bg-lavender',
  },
  {
    id: 'art',
    name: 'Art corner',
    activity: 'Draw & Guess',
    emoji: '🖌️',
    kind: 'rounds',
    roomWide: false,
    games: [
      { id: 'tel', name: 'Draw & Guess', emoji: '✏️', min: 3, max: 10, blurb: 'Pass it along and see how it ends up' },
      { id: 'copycat', name: 'Copycat', emoji: '🐱', min: 3, max: 10, blurb: 'Redraw it from memory, pass it along' },
    ],
    get area() {
      return activeMap().artArea;
    },
    // A map with an art table seats it (sit to join); otherwise you stand at the easels
    get seats() {
      const t = activeMap().artTable;
      return t ? artSeats(t).map((s) => s.id) : undefined;
    },
    built: true,
    feature: 11,
    tint: 'bg-peach',
  },
];

export const spotById = (id: SpotId) => SPOTS.find((s) => s.id === id)!;
