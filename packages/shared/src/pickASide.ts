import { areaRadius, inArea, type Area } from './maps/types.js';

/**
 * Pick a Side (docs/features/10-party-games.md): a question, a timer, and you answer by standing in a zone of the open
 * floor. When the timer ends the answers lock; the reveal shows for a moment; next question. The
 * game server plays it (`apps/game/src/pickASide.ts`).
 *
 * Modes (the spot's "games"):
 * - **Would you rather** (`wyr`): 2 zones, no right answer, the reveal shows the split.
 * - **Quiz** (`quiz`): 4 zones, +1 for the right one, highest score wins.
 *
 * Questions come in decks (one topic each): built in (below), the room's own (written by its
 * members, kept by the API). AI decks come with Plus later.
 */

export interface Question {
  id: string;
  q: string;
  answers: string[];
  /** Quiz decks: the index of the right answer. */
  right?: number;
}

export type DeckKind = 'opinion' | 'quiz';

export interface Deck {
  id: string;
  name: string;
  emoji: string;
  kind: DeckKind;
  source: 'built-in' | 'room' | 'ai';
  questions: Question[];
}

// --- A room's own decks: what one may hold (the API checks them, and so does the game server) ---

export const DECK_NAME_MAX = 40;
export const DECK_QUESTIONS_MIN = 3;
export const DECK_QUESTIONS_MAX = 50;
export const QUESTION_MAX = 120;
export const ANSWER_MAX = 40;
/** Decks one room can keep */
export const ROOM_DECKS_MAX = 100;
/** The API's signed pass that lets a host's game use a room deck (HS256 with GAME_SECRET) */
export const DECK_PASS_AUDIENCE = 'connecta-deck';
export const DECK_PASS_SECONDS = 5 * 60;

/** Whether a question fits its deck: 2 answers for an opinion deck, 4 with one right for a quiz */
export function questionFits(kind: DeckKind, q: { q: string; answers: string[]; right?: number | null }) {
  const n = kind === 'opinion' ? 2 : 4;
  return (
    q.q.trim().length > 0 &&
    q.q.length <= QUESTION_MAX &&
    q.answers.length === n &&
    q.answers.every((a) => a.trim().length > 0 && a.length <= ANSWER_MAX) &&
    (kind === 'opinion' ? q.right == null : Number.isInteger(q.right) && q.right! >= 0 && q.right! < n)
  );
}

const opinion = (id: string, name: string, emoji: string, qs: [string, string, string][]): Deck => ({
  id,
  name,
  emoji,
  kind: 'opinion',
  source: 'built-in',
  questions: qs.map(([q, a, b], i) => ({ id: `${id}-${i}`, q, answers: [a, b] })),
});

/** The right answer is always written first here; it's shuffled into place when the deck is made. */
const quiz = (id: string, name: string, emoji: string, qs: [string, string, string, string, string][]): Deck => ({
  id,
  name,
  emoji,
  kind: 'quiz',
  source: 'built-in',
  questions: qs.map(([q, ...answers], i) => {
    // A fixed spread of right answers (A–D) so the deck reads the same for everyone
    const right = (i * 3 + id.length) % 4;
    const shuffled = [...answers.slice(1)];
    shuffled.splice(right, 0, answers[0]!);
    return { id: `${id}-${i}`, q, answers: shuffled, right };
  }),
});

export const BUILT_IN: Deck[] = [
  opinion('food', 'Food', '🍜', [
    ['Would you rather…', 'only eat noodles forever', 'only eat rice forever'],
    ['Pineapple on pizza?', 'Yes, it’s great', 'Never'],
    ['Breakfast for dinner or dinner for breakfast?', 'Breakfast for dinner', 'Dinner for breakfast'],
    ['Sweet or salty snacks?', 'Sweet', 'Salty'],
    ['Would you rather…', 'give up coffee', 'give up bubble tea'],
    ['Spicy level?', 'Bring the fire 🌶️', 'Mild, please'],
    ['Cook at home or eat out?', 'Cook at home', 'Eat out'],
    ['Would you rather…', 'eat a bug once', 'never eat chocolate again'],
    ['Fries: thin or thick?', 'Thin and crispy', 'Thick and soft'],
    ['Cereal: milk first or cereal first?', 'Milk first', 'Cereal first'],
    ['Would you rather…', 'have a personal chef', 'have a personal driver'],
    ['Midnight snack?', 'Instant noodles', 'Ice cream'],
  ]),
  opinion('pets', 'Pets', '🐾', [
    ['Cats or dogs?', 'Cats 🐱', 'Dogs 🐶'],
    ['Would you rather…', 'have a pet dragon', 'have a pet unicorn'],
    ['A tiny horse or a giant hamster?', 'Tiny horse', 'Giant hamster'],
    ['Would you rather your pet could…', 'talk', 'do your homework'],
    ['Fish tank or bird cage?', 'Fish tank', 'Bird cage'],
    ['Would you rather…', 'be a cat for a day', 'be a dog for a day'],
    ['Name your pet…', 'a human name (Kevin)', 'a food name (Mochi)'],
    ['Would you rather have…', '10 hamsters', '1 horse'],
    ['Pet sleeps…', 'in my bed', 'in its own bed'],
    ['Would you rather…', 'fight a goose', 'fight 3 chickens'],
  ]),
  opinion('love', 'Love & dating', '💘', [
    ['First date?', 'Café', 'Movie'],
    ['Would you rather…', 'get a love letter', 'get a surprise gift'],
    ['Texting style?', 'Long messages', 'Many short ones'],
    ['Who says sorry first?', 'Me', 'Them'],
    ['Would you rather date someone…', 'funny', 'smart'],
    ['Plans or spontaneous?', 'Plan everything', 'Just go'],
    ['Would you rather…', 'share your phone password', 'share your search history'],
    ['Love at first sight?', 'Real', 'Not real'],
    ['Anniversary?', 'Big party', 'Quiet dinner'],
    ['Would you rather…', 'meet online', 'meet by chance'],
  ]),
  opinion('study', 'Study life', '📚', [
    ['Study at night or in the morning?', 'Night owl 🦉', 'Early bird 🐦'],
    ['Music while studying?', 'Always', 'Silence'],
    ['Would you rather…', 'have one big exam', 'have ten small tests'],
    ['Notes on…', 'paper', 'a laptop'],
    ['Group project role?', 'The leader', 'Does the slides'],
    ['Would you rather…', 'be able to speed-read', 'have a perfect memory'],
    ['Highlighter colours?', 'One colour', 'The whole rainbow'],
    ['Cram or plan ahead?', 'Cram the night before', 'Plan weeks ahead'],
    ['Would you rather…', 'study in a library', 'study in a café'],
    ['Breaks every…', '25 minutes', 'when I feel like it'],
    ['Would you rather…', 'retake one exam', 'write one more essay'],
  ]),
  opinion('weird', 'Weird', '🌀', [
    ['Would you rather…', 'have fingers as long as legs', 'legs as short as fingers'],
    ['Would you rather…', 'always be 10 minutes late', 'always be 20 minutes early'],
    ['Would you rather…', 'sneeze glitter', 'cough bubbles'],
    ['Would you rather…', 'talk to animals', 'speak every language'],
    ['Would you rather…', 'have a rewind button', 'have a pause button'],
    ['Would you rather…', 'live in a treehouse', 'live on a boat'],
    ['Would you rather…', 'only whisper', 'only shout'],
    ['Would you rather…', 'be invisible', 'be able to fly'],
    ['Would you rather…', 'have a song play when you enter', 'have a laugh track follow you'],
    ['Would you rather…', 'never be cold', 'never be hot'],
  ]),
  quiz('general', 'General knowledge', '🌍', [
    ['How many continents are there?', '7', '5', '6', '8'],
    ['What is the largest planet in our solar system?', 'Jupiter', 'Saturn', 'Earth', 'Neptune'],
    ['How many legs does a spider have?', '8', '6', '10', '12'],
    ['Which is the longest river in the world?', 'The Nile', 'The Amazon', 'The Mekong', 'The Yangtze'],
    ['How many minutes are in a day?', '1,440', '1,200', '2,400', '960'],
    ['What colour do you get mixing blue and yellow?', 'Green', 'Purple', 'Orange', 'Brown'],
    ['Which animal is the tallest?', 'Giraffe', 'Elephant', 'Camel', 'Ostrich'],
    ['How many sides does a hexagon have?', '6', '5', '7', '8'],
    ['What is frozen water called?', 'Ice', 'Steam', 'Dew', 'Fog'],
    ['Which ocean is the largest?', 'Pacific', 'Atlantic', 'Indian', 'Arctic'],
    ['How many days are in a leap year?', '366', '365', '364', '360'],
    ['What do bees make?', 'Honey', 'Milk', 'Silk', 'Wax only'],
    ['Which planet is called the Red Planet?', 'Mars', 'Venus', 'Mercury', 'Jupiter'],
    ['How many hours are in a week?', '168', '144', '172', '120'],
    ['What is the capital of Japan?', 'Tokyo', 'Kyoto', 'Osaka', 'Seoul'],
  ]),
  quiz('movies', 'Movies', '🎬', [
    ['Which film has a snowman named Olaf?', 'Frozen', 'Tangled', 'Moana', 'Brave'],
    ['In Toy Story, what is the cowboy called?', 'Woody', 'Buzz', 'Rex', 'Jessie'],
    ['Which studio made Spirited Away?', 'Studio Ghibli', 'Pixar', 'DreamWorks', 'Toei'],
    ['What is the wizard school in Harry Potter?', 'Hogwarts', 'Narnia', 'Durmstrang', 'Brakebills'],
    ['Which superhero is from Wakanda?', 'Black Panther', 'Iron Man', 'Thor', 'Hulk'],
    ['What colour is Shrek?', 'Green', 'Blue', 'Brown', 'Grey'],
    ['Finding Nemo: what kind of fish is Nemo?', 'Clownfish', 'Goldfish', 'Tuna', 'Angelfish'],
    ['Which film features the song “Let It Go”?', 'Frozen', 'Encanto', 'Coco', 'Moana'],
    ['Who lives in a pineapple under the sea?', 'SpongeBob', 'Patrick', 'Nemo', 'Ariel'],
    ['In The Lion King, who is Simba’s father?', 'Mufasa', 'Scar', 'Rafiki', 'Zazu'],
    ['My Neighbor Totoro: what does Totoro ride?', 'A Catbus', 'A broom', 'A dragon', 'A train'],
    ['Which film is about emotions inside a girl’s head?', 'Inside Out', 'Soul', 'Up', 'Luca'],
  ]),
  quiz('science', 'Science', '🔬', [
    ['What gas do plants take in?', 'Carbon dioxide', 'Oxygen', 'Nitrogen', 'Helium'],
    ['What is H₂O?', 'Water', 'Salt', 'Hydrogen', 'Air'],
    ['How many bones in an adult human?', '206', '106', '306', '186'],
    ['What is the closest star to Earth?', 'The Sun', 'Polaris', 'Sirius', 'Alpha Centauri'],
    ['What part of the cell holds DNA?', 'Nucleus', 'Membrane', 'Wall', 'Ribosome'],
    ['What force keeps us on the ground?', 'Gravity', 'Magnetism', 'Friction', 'Inertia'],
    ['Water boils at… (sea level)', '100 °C', '90 °C', '120 °C', '80 °C'],
    ['Which organ pumps blood?', 'Heart', 'Lungs', 'Liver', 'Brain'],
    ['What is the hardest natural material?', 'Diamond', 'Gold', 'Iron', 'Quartz'],
    ['Light travels fastest in…', 'A vacuum', 'Water', 'Glass', 'Air'],
    ['What do we call animals that eat only plants?', 'Herbivores', 'Carnivores', 'Omnivores', 'Insectivores'],
    ['Which planet has the most famous rings?', 'Saturn', 'Uranus', 'Mars', 'Venus'],
  ]),
  quiz('geo', 'Geography', '🗺️', [
    ['What is the capital of Thailand?', 'Bangkok', 'Chiang Mai', 'Phuket', 'Pattaya'],
    ['Which country is shaped like a boot?', 'Italy', 'Spain', 'Greece', 'Chile'],
    ['Mount Everest is on the border of Nepal and…', 'China', 'India', 'Bhutan', 'Pakistan'],
    ['Which is the biggest country by area?', 'Russia', 'Canada', 'China', 'USA'],
    ['What is the capital of Australia?', 'Canberra', 'Sydney', 'Melbourne', 'Perth'],
    ['The Sahara is in…', 'Africa', 'Asia', 'Australia', 'South America'],
    ['Which country has the most people?', 'India', 'China', 'USA', 'Indonesia'],
    ['Where is the Eiffel Tower?', 'Paris', 'Rome', 'London', 'Berlin'],
    ['Which sea is the saltiest you can float in?', 'The Dead Sea', 'The Red Sea', 'The Black Sea', 'The North Sea'],
    ['Angkor Wat is in…', 'Cambodia', 'Laos', 'Vietnam', 'Myanmar'],
    ['Which continent is the coldest?', 'Antarctica', 'Europe', 'Asia', 'North America'],
    ['What is the capital of South Korea?', 'Seoul', 'Busan', 'Incheon', 'Daegu'],
  ]),
];

export const deckKindFor = (mode: string): DeckKind => (mode === 'wyr' ? 'opinion' : 'quiz');

export type SideMode = 'wyr' | 'quiz';

export interface SideGame {
  mode: SideMode;
  deck: Deck;
  questions: Question[];
  i: number;
  stage: 'ask' | 'reveal' | 'done';
  until: number;
  /** The current question's locked answers (null = in no zone). Empty while asking. */
  answers: Record<string, number | null>;
  scores: Record<string, number>;
  /** Would you rather: how often each person stood on your side. */
  agree: Record<string, number>;
  /** Who won at the end (several when they tie, or when the deck ran out with people left). */
  winners: string[];
  /** Started with one player: no split and no winner, just how you did. */
  solo: boolean;
}

export const ASK_MS: Record<SideMode, number> = { wyr: 10_000, quiz: 15_000 };
export const REVEAL_MS = 4_000;
export const QUESTIONS: Record<SideMode, number> = { wyr: 10, quiz: 10 };
export const sidesFor = (mode: SideMode) => (mode === 'wyr' ? 2 : 4);

export const ZONE_COLORS = ['#ff8fb8', '#7ab8ff', '#ffd166', '#7fd8b6'];
export const LETTERS = ['A', 'B', 'C', 'D'];

/**
 * Zones are the rug's own halves or quarters, cut along its edges (a 2×2 square, never pizza slices).
 * The camera looks in from +x +z, so the square shows as a diamond: A at the top of the screen, B on
 * the right, C on the left, D at the bottom. That's the HUD's 2×2 grid turned 45°, so A–D sit the same
 * way round in both. With two zones, A is the half up and left, B down and right.
 */
export function zoneAt(area: Area, sides: number, x: number, z: number): number | null {
  if (!inArea(area, x, z)) return null;
  const col = x - area.x < 0 ? 0 : 1;
  if (sides === 2) return col;
  return (z - area.z < 0 ? 0 : 2) + col;
}

/** The middle of a zone, as an offset from the rug's centre (room x, z). */
export function zoneOffset(area: Area, sides: number, zone: number) {
  const k = areaRadius(area) * 0.5;
  const dx = (zone % 2 === 0 ? -1 : 1) * k;
  const dz = sides === 2 ? 0 : (zone < 2 ? -1 : 1) * k;
  return { dx, dz };
}

/**
 * The next game's questions: ones this room hasn't played from the deck first (`played`, the room's
 * memory of this deck, updated here); once the deck runs out, it starts over.
 */
export function draw(deck: Deck, count: number, played: Set<string> = new Set()): Question[] {
  const shuffle = (qs: Question[]) => [...qs].sort(() => Math.random() - 0.5);
  let fresh = shuffle(deck.questions.filter((q) => !played.has(q.id)));
  if (fresh.length < count) {
    // Not enough new ones: the unplayed first, then the rest again
    played.clear();
    fresh = [...fresh, ...shuffle(deck.questions.filter((q) => !fresh.includes(q)))];
  }
  const out = fresh.slice(0, count);
  out.forEach((q) => played.add(q.id));
  return out;
}

export function newGame(mode: SideMode, deck: Deck, now: number, solo = false, played?: Set<string>): SideGame {
  return {
    mode,
    deck,
    questions: draw(deck, QUESTIONS[mode], played),
    i: 0,
    stage: 'ask',
    until: now + ASK_MS[mode],
    answers: {},
    scores: {},
    agree: {},
    winners: [],
    solo,
  };
}
