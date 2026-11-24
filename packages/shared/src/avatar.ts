/** Anime moe chibi look. Only values from these palettes are accepted. */

export const HAIR_COLORS = ['#f59ac0', '#a58be8', '#8fdcc0', '#f7b267', '#fff1a8', '#c8e3ff', '#46527f', '#34313f'] as const;
export const OUTFIT_COLORS = ['#ff6fa8', '#7c5cff', '#2f80ed', '#12a37f', '#ef8a3c', '#e84855'] as const;
/** The free accessories everyone can wear */
export const ACCESSORIES = ['none', 'ribbon', 'catEars', 'glasses', 'headphones', 'ahoge', 'twintails'] as const;
/** Bought in the Shop with coins (prices in ./shop) */
export const SHOP_ACCESSORIES = ['bunnyEars', 'bearEars', 'starClips', 'flowerCrown', 'halo', 'witchHat'] as const;
export const ALL_ACCESSORIES = [...ACCESSORIES, ...SHOP_ACCESSORIES] as const;

export type Accessory = (typeof ALL_ACCESSORIES)[number];

/** Outfit shapes: the sailor top is free, the rest come from the Shop. Each takes the outfit colour. */
export const OUTFIT_STYLES = ['sailor', 'hoodie', 'overalls', 'raincoat', 'yukata'] as const;
export type OutfitStyle = (typeof OUTFIT_STYLES)[number];

export interface AvatarLook {
  hair: string;
  outfit: string;
  accessory: Accessory;
  /** Missing = the free sailor top */
  style?: OutfitStyle;
}

/** One look change every 5 s, so nobody flickers outfits in a room (the API enforces it) */
export const LOOK_COOLDOWN_MS = 5000;

export const DEFAULT_LOOK: AvatarLook = { hair: HAIR_COLORS[0], outfit: OUTFIT_COLORS[0], accessory: 'ribbon', style: 'sailor' };

const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]!;

export function randomLook(): AvatarLook {
  return { hair: pick(HAIR_COLORS), outfit: pick(OUTFIT_COLORS), accessory: pick(ACCESSORIES) };
}

/** Coerce untrusted input (from the network or storage) into a valid look. */
export function sanitizeLook(input: unknown): AvatarLook {
  const raw = (typeof input === 'object' && input !== null ? input : {}) as Record<string, unknown>;
  const inList = <T extends string>(list: readonly T[], v: unknown, fallback: T): T =>
    typeof v === 'string' && (list as readonly string[]).includes(v) ? (v as T) : fallback;
  return {
    hair: inList(HAIR_COLORS, raw.hair, DEFAULT_LOOK.hair),
    outfit: inList(OUTFIT_COLORS, raw.outfit, DEFAULT_LOOK.outfit),
    accessory: inList(ALL_ACCESSORIES, raw.accessory, DEFAULT_LOOK.accessory),
    style: inList(OUTFIT_STYLES, raw.style, 'sailor'),
  };
}
