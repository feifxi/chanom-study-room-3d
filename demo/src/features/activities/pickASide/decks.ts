import { useSyncExternalStore } from 'react';
import { ME } from '@/lib/mock';

/**
 * Pick a Side's question decks (feature 11). A deck is one topic; the game draws the questions.
 * - **Opinion** decks (Would you rather): two answers, no right one.
 * - **Quiz** decks (Quiz, Last one standing): four answers, one right.
 * Decks come from three places: built in, your own (saved to your account), or made by AI.
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
  source: 'built-in' | 'mine' | 'ai';
  questions: Question[];
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

// --- Your own decks (saved to your account; the demo keeps them in this browser) ---

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
  writeMine(i >= 0 ? mine.map((d) => (d.id === deck.id ? deck : d)) : [...mine, { ...deck, source: 'mine' }]);
}

export function deleteDeck(id: string) {
  writeMine(readMine().filter((d) => d.id !== id));
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
