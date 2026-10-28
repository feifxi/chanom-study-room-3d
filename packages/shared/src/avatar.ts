/** Anime moe chibi look. Only values from these palettes are accepted. */

export const HAIR_COLORS = ['#f59ac0', '#a58be8', '#8fdcc0', '#f7b267', '#fff1a8', '#c8e3ff', '#46527f', '#34313f'] as const;
export const OUTFIT_COLORS = ['#ff6fa8', '#7c5cff', '#2f80ed', '#12a37f', '#ef8a3c', '#e84855'] as const;
export const ACCESSORIES = ['none', 'ribbon', 'catEars', 'glasses', 'headphones', 'ahoge', 'twintails'] as const;

export type Accessory = (typeof ACCESSORIES)[number];

export interface AvatarLook {
  hair: string;
  outfit: string;
  accessory: Accessory;
}

export const DEFAULT_LOOK: AvatarLook = { hair: HAIR_COLORS[0], outfit: OUTFIT_COLORS[0], accessory: 'ribbon' };

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
    accessory: inList(ACCESSORIES, raw.accessory, DEFAULT_LOOK.accessory),
  };
}
