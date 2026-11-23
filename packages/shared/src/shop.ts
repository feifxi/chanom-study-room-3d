import type { Accessory, OutfitStyle } from './avatar.js';

/**
 * The Shop (spec 15): only things that really show on your character, bought with earned coins.
 * Outfits take your outfit colour, so each comes in every colour. Newest last ("New this week").
 */
export type ShopItem =
  | { id: string; kind: 'accessory'; value: Accessory; name: string; emoji: string; price: number; blurb: string }
  | { id: string; kind: 'outfit'; value: OutfitStyle; name: string; emoji: string; price: number; blurb: string }
  /** A pet: a cat coat (PET_COATS in ./npc), summoned from the Buddy Machine; its name is the default pet name */
  | { id: string; kind: 'pet'; value: string; name: string; emoji: string; price: number; blurb: string };

export const SHOP_ITEMS: readonly ShopItem[] = [
  {
    id: 'bunnyEars',
    kind: 'accessory',
    value: 'bunnyEars',
    name: 'Bunny Ears',
    emoji: '🐰',
    price: 200,
    blurb: 'Tall, soft and a little floppy',
  },
  {
    id: 'bearEars',
    kind: 'accessory',
    value: 'bearEars',
    name: 'Bear Ears',
    emoji: '🧸',
    price: 200,
    blurb: 'Round ears in your hair colour',
  },
  {
    id: 'starClips',
    kind: 'accessory',
    value: 'starClips',
    name: 'Star Clips',
    emoji: '⭐',
    price: 220,
    blurb: 'Two gold stars in your fringe',
  },
  {
    id: 'flowerCrown',
    kind: 'accessory',
    value: 'flowerCrown',
    name: 'Flower Crown',
    emoji: '🌸',
    price: 280,
    blurb: 'A ring of spring flowers',
  },
  { id: 'halo', kind: 'accessory', value: 'halo', name: 'Halo', emoji: '😇', price: 300, blurb: 'Floats over your head, softly glowing' },
  { id: 'witchHat', kind: 'accessory', value: 'witchHat', name: 'Witch Hat', emoji: '🧙', price: 380, blurb: 'A wide brim and a bent tip' },
  { id: 'hoodie', kind: 'outfit', value: 'hoodie', name: 'Hoodie', emoji: '🧥', price: 500, blurb: 'Comfy, with a hood and a big pocket' },
  {
    id: 'overalls',
    kind: 'outfit',
    value: 'overalls',
    name: 'Overalls',
    emoji: '👖',
    price: 550,
    blurb: 'Over a white tee, with gold buttons',
  },
  {
    id: 'raincoat',
    kind: 'outfit',
    value: 'raincoat',
    name: 'Raincoat',
    emoji: '☔',
    price: 650,
    blurb: 'A little hood and matching boots',
  },
  { id: 'yukata', kind: 'outfit', value: 'yukata', name: 'Yukata', emoji: '🎐', price: 800, blurb: 'A summer robe with a sash and a bow' },
  {
    id: 'catMidnight',
    kind: 'pet',
    value: 'midnight',
    name: 'Midnight',
    emoji: '🐈‍⬛',
    price: 1000,
    blurb: 'Black, with gold eyes and a star tag',
  },
  { id: 'catTux', kind: 'pet', value: 'gent', name: 'Tux', emoji: '🎩', price: 1200, blurb: 'Black and white, in a little bow tie' },
  {
    id: 'catSiamese',
    kind: 'pet',
    value: 'siamese',
    name: 'Siamese',
    emoji: '🔔',
    price: 1200,
    blurb: 'Cream with dark points and a bell collar',
  },
  {
    id: 'catSnowball',
    kind: 'pet',
    value: 'snowball',
    name: 'Snowball',
    emoji: '🤍',
    price: 1000,
    blurb: 'A fluffy white cat with a pink bow',
  },
];

export const shopItem = (id: string) => SHOP_ITEMS.find((i) => i.id === id);
