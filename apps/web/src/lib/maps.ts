/** The map catalogue the pages show (names, moods, what each piece looks like); the 3D maps themselves live in features/map. */

/**
 * The standard kit (docs/features/06-maps.md): every map has every piece, so every activity works in every map.
 * Templates differ only in the place, the props and the theme; `look` says how each piece looks.
 */
export const KIT = [
  { id: 'study', name: 'Study spots', need: '12+ seats' },
  { id: 'lounge', name: 'Lounge', need: 'a sofa corner to hang out' },
  { id: 'private', name: 'Private zones', need: 'at least 2' },
  { id: 'screen', name: 'Big screen', need: 'watch together' },
  { id: 'games', name: 'Card table', need: 'card games' },
  { id: 'floor', name: 'Open floor', need: 'room for Pick a Side' },
  { id: 'whiteboard', name: 'Whiteboard', need: 'draw together' },
  { id: 'buddy', name: 'Buddy Machine', need: 'study buddies' },
  { id: 'nap', name: 'Nap spots', need: 'where the cats sleep' },
  { id: 'spawn', name: 'Spawn point', need: 'where you walk in' },
] as const;
export type KitId = (typeof KIT)[number]['id'];

export interface MapTemplate {
  id: string;
  name: string;
  emoji: string;
  blurb: string;
  /** One line on how it feels. */
  mood: string;
  /** The zones you'd name when telling a friend where you are. */
  zones: string[];
  tint: string;
  /** How each standard-kit piece looks in this map. */
  look: Record<KitId, string>;
}

export const MAPS: MapTemplate[] = [
  {
    id: 'library',
    name: 'Cosy Library',
    emoji: '📚',
    blurb: 'Long tables under warm lamps, a fireplace, a TV lounge and games by the door.',
    mood: 'Quiet focus, rain on the windows',
    zones: ['Study tables', 'Fireside', 'TV lounge', 'Lantern circle'],
    tint: 'bg-lavender',
    look: {
      study: 'Small and long tables with green lamps',
      lounge: 'The TV lounge: sofa, beanbags, cushions',
      private: 'Fireside, window booth',
      screen: 'TV on an oak console',
      games: 'Two oak card tables, a lantern circle',
      floor: 'The four-colour rug by the door',
      whiteboard: 'Board in an oak frame',
      buddy: 'Buddy Machine by the door',
      nap: 'The hearth, a shelf, the sofa corner',
      spawn: 'The front door',
    },
  },
  {
    id: 'cafe',
    name: 'Cat Café',
    emoji: '🐈',
    blurb: 'Café tables, cats everywhere and a big TV for watching together.',
    mood: 'Warm, chatty, a cat on every chair',
    zones: ['The bar', 'Window booths', 'TV lounge', 'Cat tower'],
    tint: 'bg-peach',
    look: {
      study: 'The bar, a window bar and café tables',
      lounge: 'Beanbags by the cat tower',
      private: 'Booths by the window',
      screen: 'TV on the wall',
      games: 'Two card tables, a lantern circle',
      floor: 'The paw-print dance floor in front of the bar',
      whiteboard: 'Menu board',
      buddy: 'Buddy Machine by the till',
      nap: 'Cat beds and the cat tower',
      spawn: 'Shop door with a bell',
    },
  },
  {
    id: 'rooftop',
    name: 'Starry Rooftop',
    emoji: '🌙',
    blurb: 'Fairy lights, beanbags, a campfire circle and a telescope under the stars.',
    mood: 'Late-night talks under the stars',
    zones: ['Campfire circle', 'Stargazing deck', 'Rooftop desks'],
    tint: 'bg-sky',
    look: {
      study: 'Picnic desks under fairy lights',
      lounge: 'Campfire circle with beanbags',
      private: 'Tent, telescope deck',
      screen: 'Outdoor cinema sheet',
      games: 'Low table with cards',
      floor: 'The open deck',
      whiteboard: 'Chalk wall by the stairs',
      buddy: 'Buddy Machine by the stairs',
      nap: 'Hammocks',
      spawn: 'The stairwell door',
    },
  },
];

/** Template ideas we liked, for later (docs/features/06-maps.md). Same standard kit, different place. */
export const FUTURE_MAPS = [
  { name: 'Greenhouse', emoji: '🌿', idea: 'Plants, glass roof, a watering-can lamp' },
  { name: 'Bakery Kitchen', emoji: '🥐', idea: 'Flour-dusted counters, oven glow, bread on the shelves' },
  { name: 'Kotatsu House', emoji: '🍊', idea: 'Japanese house, kotatsu tables, snow outside' },
  { name: 'Beach Hut', emoji: '🏖️', idea: 'Wooden deck, waves, hammocks' },
  { name: 'Space Station', emoji: '🚀', idea: 'Round windows on Earth, floating plants' },
];
