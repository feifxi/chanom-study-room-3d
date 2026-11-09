import { COLORS, SIZES } from '../board/board';

/** 🎲 ideas for the first prompt (and for Knock-off's first drawing). */
export const PROMPTS = [
  'a cat stuck in a bubble tea',
  'a sleepy dragon doing homework',
  'a penguin on holiday',
  'a robot falling in love with a toaster',
  'a snail winning a race',
  'a ghost who is scared of people',
  'a frog playing guitar',
  'a pizza with feelings',
  'a duck in a business meeting',
  'a cactus that wants a hug',
  'a house on a giant turtle',
  'a fish riding a bicycle',
  'a sun wearing sunglasses',
  'a potato going to the gym',
  'a flower that can sing',
  'a tree with a door',
  'grandma on a skateboard',
  'a cloud that is crying rice',
  'a dog cooking noodles',
  'an alien at the dentist',
];

export const randomPrompt = () => PROMPTS[Math.floor(Math.random() * PROMPTS.length)]!;

export interface DoodleStroke {
  color: string;
  size: number;
  pts: number[];
}

const ring = (cx: number, cy: number, rx: number, ry: number, n = 36) =>
  Array.from({ length: n + 1 }, (_, i) => [cx + Math.cos((i / n) * Math.PI * 2) * rx, cy + Math.sin((i / n) * Math.PI * 2) * ry]).flat();

const ink = COLORS[0]!;
const M = SIZES[1]!;

/**
 * Demo only: simple doodles the scripted players draw, with what they'd guess when they see one.
 * The real game has only people.
 */
export const DOODLES: { name: string; words: string[]; guesses: string[]; strokes: () => DoodleStroke[] }[] = [
  {
    name: 'cat',
    words: ['cat', 'kitten'],
    guesses: ['a cat', 'a grumpy cat', 'a cat with whiskers', 'a fox?'],
    strokes: () => [
      { color: ink, size: M, pts: ring(0.5, 0.56, 0.15, 0.25) },
      { color: ink, size: M, pts: [0.38, 0.42, 0.39, 0.18, 0.46, 0.33] },
      { color: ink, size: M, pts: [0.54, 0.33, 0.61, 0.18, 0.62, 0.42] },
      { color: ink, size: SIZES[2]!, pts: [0.45, 0.52] },
      { color: ink, size: SIZES[2]!, pts: [0.55, 0.52] },
      { color: ink, size: SIZES[0]!, pts: [0.41, 0.62, 0.3, 0.6, 0.41, 0.66, 0.3, 0.69] },
      { color: ink, size: SIZES[0]!, pts: [0.59, 0.62, 0.7, 0.6, 0.59, 0.66, 0.7, 0.69] },
    ],
  },
  {
    name: 'house',
    words: ['house', 'home', 'door'],
    guesses: ['a house', 'a tiny house', 'a barn', 'a birdhouse'],
    strokes: () => [
      { color: ink, size: M, pts: [0.33, 0.45, 0.33, 0.85, 0.67, 0.85, 0.67, 0.45] },
      { color: COLORS[1]!, size: M, pts: [0.28, 0.47, 0.5, 0.2, 0.72, 0.47] },
      { color: COLORS[4]!, size: M, pts: [0.46, 0.85, 0.46, 0.66, 0.55, 0.66, 0.55, 0.85] },
      { color: COLORS[2]!, size: M, pts: ring(0.4, 0.56, 0.035, 0.06, 16) },
    ],
  },
  {
    name: 'sun',
    words: ['sun', 'sunglasses', 'summer', 'holiday'],
    guesses: ['the sun', 'a happy sun', 'a lion?', 'a flower'],
    strokes: () => [
      { color: COLORS[4]!, size: SIZES[2]!, pts: ring(0.5, 0.5, 0.12, 0.21) },
      ...Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return {
          color: COLORS[4]!,
          size: M,
          pts: [0.5 + Math.cos(a) * 0.16, 0.5 + Math.sin(a) * 0.28, 0.5 + Math.cos(a) * 0.24, 0.5 + Math.sin(a) * 0.42],
        };
      }),
      { color: ink, size: M, pts: [0.44, 0.58, 0.5, 0.63, 0.56, 0.58] },
    ],
  },
  {
    name: 'fish',
    words: ['fish', 'sea', 'ocean', 'penguin', 'duck'],
    guesses: ['a fish', 'a goldfish', 'a whale', 'a fish with legs'],
    strokes: () => [
      { color: COLORS[2]!, size: M, pts: ring(0.47, 0.5, 0.16, 0.18) },
      { color: COLORS[2]!, size: M, pts: [0.62, 0.5, 0.74, 0.36, 0.74, 0.64, 0.62, 0.5] },
      { color: ink, size: SIZES[2]!, pts: [0.39, 0.46] },
    ],
  },
  {
    name: 'flower',
    words: ['flower', 'cactus', 'tree', 'garden', 'sing'],
    guesses: ['a flower', 'a sunflower', 'a tree', 'a lollipop'],
    strokes: () => [
      { color: COLORS[3]!, size: M, pts: [0.5, 0.5, 0.5, 0.9] },
      { color: COLORS[3]!, size: M, pts: [0.5, 0.75, 0.6, 0.66] },
      ...[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2;
        return { color: COLORS[1]!, size: M, pts: ring(0.5 + Math.cos(a) * 0.07, 0.36 + Math.sin(a) * 0.12, 0.05, 0.09, 16) };
      }),
      { color: COLORS[4]!, size: SIZES[2]!, pts: [0.5, 0.36] },
    ],
  },
  {
    name: 'potato',
    words: ['potato', 'pizza', 'food', 'noodles', 'gym'],
    guesses: ['a potato', 'a rock', 'a sad potato', 'a bean'],
    strokes: () => [
      { color: COLORS[4]!, size: M, pts: ring(0.5, 0.52, 0.2, 0.22, 20) },
      { color: ink, size: SIZES[2]!, pts: [0.44, 0.48] },
      { color: ink, size: SIZES[2]!, pts: [0.56, 0.48] },
      { color: ink, size: SIZES[0]!, pts: [0.45, 0.62, 0.5, 0.58, 0.55, 0.62] },
    ],
  },
];

export const FUNNY_GUESSES = ['a potato with legs', 'modern art', 'my homework', 'a cloud?', 'a sad blob', 'no idea, sorry'];

/** A doodle with a little wobble, so copies don't look identical. */
export function wobble(strokes: DoodleStroke[], amount = 0.012): DoodleStroke[] {
  const dx = (Math.random() - 0.5) * amount * 4;
  const dy = (Math.random() - 0.5) * amount * 4;
  return strokes.map((s) => ({ ...s, pts: s.pts.map((v, i) => v + (i % 2 ? dy : dx) + (Math.random() - 0.5) * amount) }));
}
