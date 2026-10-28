/** Room NPCs summoned from the gachapon "Buddy Machine". Nobody owns them; anyone can tune them. */

export const NPC_KINDS = ['cat', 'buddy'] as const;
export type NpcKind = (typeof NPC_KINDS)[number];

export const NPC_LIMITS = { total: 6, cat: 4, buddy: 3 } as const;
export const SPIN_COOLDOWN_MS = 8000;
/** Delay between the spin and the NPC appearing, so the capsule animation plays first. */
export const SPIN_REVEAL_MS = 1800;
export const NPC_REACH = 1.4;
export const NPC_NAME_MAX = 14;

export interface CatCoat {
  id: string;
  label: string;
  body: string;
  belly: string;
  /** Optional patch colours (calico, tuxedo). */
  patches?: string[];
  rare?: boolean;
  /** Relative odds when spinning. */
  weight: number;
}

export const CAT_COATS: CatCoat[] = [
  { id: 'orange', label: 'Orange tabby', body: '#f2a65a', belly: '#fde3c4', weight: 24 },
  { id: 'tuxedo', label: 'Tuxedo', body: '#34313b', belly: '#ffffff', weight: 19 },
  { id: 'calico', label: 'Calico', body: '#fff6ec', belly: '#ffffff', patches: ['#f2a65a', '#3a3538'], weight: 19 },
  { id: 'grey', label: 'Grey', body: '#9ea6b8', belly: '#e8ebf2', weight: 19 },
  { id: 'white', label: 'Snow white', body: '#fbfbfb', belly: '#ffe3ea', weight: 14 },
  { id: 'golden', label: '✨ Golden', body: '#ffcf3f', belly: '#fff3b0', rare: true, weight: 5 },
];
export const COAT_BY_ID: ReadonlyMap<string, CatCoat> = new Map(CAT_COATS.map((c) => [c.id, c]));

export const CAT_NAMES = ['Mochi', 'Tofu', 'Bao', 'Miso', 'Kuro', 'Nori', 'Latte', 'Pudding', 'Sesame', 'Yuzu', 'Boba', 'Kiwi'];
export const BUDDY_NAMES = ['Pim', 'Sora', 'Riku', 'Mai', 'Ten', 'Nami', 'Haru', 'Yui', 'Oat', 'Fah'];
export const BUDDY_SUBJECTS = ['Calculus', 'English', 'Physics', 'History', 'Biology', 'Coding', 'Chemistry', 'Art history'];

export interface CatSettings {
  /** false = stays in the reading nook */
  roam: boolean;
}

export interface BuddySettings {
  /** false = never talks to someone who is focusing */
  chatty: boolean;
  subject: string;
  focusMin: 25 | 50;
}

export type NpcSettings = CatSettings | BuddySettings;

export const DEFAULT_CAT_SETTINGS: CatSettings = { roam: true };
export const defaultBuddySettings = (subject: string): BuddySettings => ({ chatty: true, subject, focusMin: 25 });

/** Synced NPC, as clients see it. `look` and `settings` are JSON. */
export interface NpcView {
  kind: NpcKind;
  name: string;
  look: string;
  settings: string;
  x: number;
  z: number;
  /** Height off the floor (e.g. napping on the sofa). */
  y: number;
  yaw: number;
  moving: boolean;
  /** idle | walk | sit | nap | groom | stretch */
  anim: string;
  seatId: string;
  status: string;
  statusEndsAt: number;
  focusSince: number;
  subject: string;
}

export interface GachaSpun {
  npcId: string;
  kind: NpcKind;
  name: string;
  /** Human label, e.g. "Calico cat" or "Study buddy". */
  label: string;
  rare: boolean;
  bySessionId: string;
  byName: string;
}

export const CAT_PET_LINES = ['purr~ ❤️', 'mrrp! ❤️', '*happy blink* ✨', 'prrrr ❤️', '*headbutt* ❤️'];
export const CAT_WAKE_LINES = ['mrrp?', '*yawn*', 'mew?'];
export const BUDDY_CHEER_LINES = [
  (name: string, min: number) => `Nice ${min} minutes, ${name}! ✨`,
  (name: string) => `Great focus, ${name}! Take a breather ☕`,
  (name: string, min: number) => `${min} min done! You're on a roll, ${name} 🔥`,
];
export const BUDDY_GREET_LINES = [
  (name: string) => `Hi ${name}! Want to study together? 📚`,
  (name: string) => `Welcome, ${name}! There's a free seat here 😊`,
];
export const BUDDY_IDLE_LINES = ['Just finding a good seat!', 'Ready when you are 📚', 'Hydrate! 💧', 'Posture check! 🙆'];
export const BUDDY_YIELD_LINES = ['Oh, take my seat! 😊', 'Sure, it’s yours!', 'I’ll find another spot ✨'];
export const GOODBYE_LINES = ['Bye bye! 👋', 'See you next time! 👋', 'Thanks for having me! 👋'];

export const pickRandom = <T>(arr: readonly T[], rand: () => number = Math.random): T => arr[Math.floor(rand() * arr.length)]!;

/** Weighted coat roll; the golden cat is rare. */
export function rollCoat(rand: () => number = Math.random): CatCoat {
  const total = CAT_COATS.reduce((n, c) => n + c.weight, 0);
  let roll = rand() * total;
  for (const c of CAT_COATS) {
    roll -= c.weight;
    if (roll <= 0) return c;
  }
  return CAT_COATS[0]!;
}
