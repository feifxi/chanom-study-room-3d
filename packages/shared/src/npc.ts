/**
 * Room NPCs, summoned from the Buddy Machine. Nobody owns them and there's
 * nothing to configure: summon one, and anyone can say goodbye to it.
 */

export const NPC_KINDS = ['cat', 'buddy'] as const;
export type NpcKind = (typeof NPC_KINDS)[number];

export const NPC_LIMITS = { total: 6, cat: 4, buddy: 3 } as const;
export const SUMMON_COOLDOWN_MS = 8000;
/** Delay between summoning and the NPC appearing, so the capsule animation plays first. */
export const SUMMON_REVEAL_MS = 1800;
/** How close you need to be to pet a cat. */
export const NPC_REACH = 1.4;
/** Collision radius by kind; players are PLAYER_RADIUS. */
export const NPC_RADIUS = { cat: 0.22, buddy: 0.3 } as const;
export const npcRadius = (kind: string) => (kind === 'cat' ? NPC_RADIUS.cat : NPC_RADIUS.buddy);

export interface CatCoat {
  id: string;
  label: string;
  body: string;
  belly: string;
  /** Optional patch colours (calico). */
  patches?: string[];
}

/** Every coat is equally likely: summoning is just for fun, there's nothing rare to chase. */
export const CAT_COATS: CatCoat[] = [
  { id: 'orange', label: 'Orange tabby', body: '#f2a65a', belly: '#fde3c4' },
  { id: 'tuxedo', label: 'Tuxedo', body: '#34313b', belly: '#ffffff' },
  { id: 'calico', label: 'Calico', body: '#fff6ec', belly: '#ffffff', patches: ['#f2a65a', '#3a3538'] },
  { id: 'grey', label: 'Grey', body: '#9ea6b8', belly: '#e8ebf2' },
  { id: 'white', label: 'Snow white', body: '#fbfbfb', belly: '#ffe3ea' },
];
export const COAT_BY_ID: ReadonlyMap<string, CatCoat> = new Map(CAT_COATS.map((c) => [c.id, c]));

export const CAT_NAMES = ['Mochi', 'Tofu', 'Bao', 'Miso', 'Kuro', 'Nori', 'Latte', 'Pudding', 'Sesame', 'Yuzu', 'Boba', 'Kiwi'];
export const BUDDY_NAMES = ['Pim', 'Sora', 'Riku', 'Mai', 'Ten', 'Nami', 'Haru', 'Yui', 'Oat', 'Fah'];
export const BUDDY_SUBJECTS = ['Calculus', 'English', 'Physics', 'History', 'Biology', 'Coding', 'Chemistry', 'Art history'];
/** Study buddies run 25 / 5 pomodoros. */
export const BUDDY_FOCUS_MIN = 25;
export const BUDDY_BREAK_MIN = 5;

/** Synced NPC, as clients see it. `look` is JSON (a cat coat, or a character look). */
export interface NpcView {
  kind: NpcKind;
  name: string;
  look: string;
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
  /** Session id of the person a cat is tagging along with ('' = nobody). */
  following: string;
}

/** Broadcast when someone summons: the capsule animation starts now, the NPC appears SUMMON_REVEAL_MS later. */
export interface NpcSummoned {
  npcId: string;
  kind: NpcKind;
  name: string;
  /** Human label, e.g. "calico cat" or "study buddy". */
  label: string;
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
export const BUDDY_YIELD_LINES = ['Oh, take my seat! 😊', 'Sure, it’s yours!', 'I’ll find another spot ✨'];
export const GOODBYE_LINES = ['Bye bye! 👋', 'See you next time! 👋', 'Thanks for having me! 👋'];

export const pickRandom = <T>(arr: readonly T[], rand: () => number = Math.random): T => arr[Math.floor(rand() * arr.length)]!;

/** Parse a synced JSON field (an NPC's look), falling back instead of throwing on bad data. */
export function parseJson<T>(json: string, fallback: T): T {
  try {
    const value = JSON.parse(json) as T | null;
    return value ?? fallback;
  } catch {
    return fallback;
  }
}
