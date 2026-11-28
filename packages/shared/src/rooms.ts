/**
 * Room rules shared by the web app (what to show) and the API (the final say): docs/features/02-rooms.md.
 */

export const ROOM_NAME_MAX = 32;
export const ROOM_DESCRIPTION_MAX = 200;
export const ROOM_RULES_MAX = 1000;
/** The optional note with an Ask to join request */
export const JOIN_NOTE_MAX = 150;
/** A declined person can ask again after this many days */
export const REQUEST_COOLDOWN_DAYS = 7;
/** A guest pass works this long after it's made */
export const GUEST_PASS_HOURS = 24;

/** The launch templates (docs/features/06-maps.md). Every one has the same standard kit. */
export const MAP_IDS = ['library', 'cafe', 'rooftop'] as const;
export type MapId = (typeof MAP_IDS)[number];
export const MAP_EMOJI: Record<MapId, string> = { library: '📚', cafe: '🐈', rooftop: '🌙' };

export const ROOM_TIMES = ['clock', 'day', 'night'] as const;
export type RoomTime = (typeof ROOM_TIMES)[number];

/** Private: invite only, not listed. Ask to join: listed, mods approve. Open: listed, anyone joins. */
export const VISIBILITIES = ['private', 'request', 'open'] as const;
export type Visibility = (typeof VISIBILITIES)[number];

/** Discover's fixed lists: free-text tags only get spammed (docs/features/02-rooms.md). Up to 3 tags. */
export const ROOM_TAGS = ['Study', 'Chill', 'Games', 'Language exchange', 'Music', 'Art', 'Anime', 'Late night'] as const;
export const ROOM_TAGS_MAX = 3;
export const ROOM_LANGUAGES = ['Thai', 'English', 'Japanese', 'Korean', 'Chinese', 'Mixed'] as const;

export const DEFAULT_ROOM_RULES = '1. Be kind, no drama.\n2. Quiet at the study tables; chat in the lounge.\n3. No spam or selling.';

/**
 * One subscription, Connecta Plus (docs/features/15-plus.md). The numbers wait on the playtest, so they all live here.
 * A room follows its owner's plan (`capacity`, `members`, `shareHeight` for screen shares); the
 * rest follow your own (`owns`: rooms you can make, `rooms`: rooms you can be in, `uploadMb`, the
 * animated name tag). Rooms are for groups, so even Plus stops at 30 inside: every map is built
 * for 30, and the 3D budget is set for that crowd (docs/decisions.md, 2026-11-28).
 */
export const ROOM_PLANS = {
  free: { capacity: 15, members: 30, rooms: 100, owns: 10, uploadMb: 10, shareHeight: 720 },
  plus: { capacity: 30, members: 100, rooms: 200, owns: 30, uploadMb: 50, shareHeight: 1080 },
} as const;
export const planOf = (plus: boolean) => ROOM_PLANS[plus ? 'plus' : 'free'];

/** Most people inside at once (the owner can set it lower in Room settings) */
export const maxInside = (plus: boolean) => planOf(plus).capacity;

/** Mods per room, on every plan */
export const MODS_MAX = 5;

/**
 * Seats held back in every room so the people running it can always get in, inside the cap (it
 * never bends): one only the owner takes, one the first mod takes. Everyone else fills the rest, so
 * a full Plus room is 28 + the owner + a mod. More mods take an ordinary seat if there is one.
 * Common rooms have no owner or mods, so they hold nothing back.
 */
export const HELD_SEATS = 2;
/** The fewest people at once an owner can set: the held seats and one more */
export const MIN_CAPACITY = HELD_SEATS + 1;

/** A room's people at once: the owner's setting within the plan, never below the held seats and one more */
export const roomCapacity = (set: number | null, max: number) => Math.max(MIN_CAPACITY, Math.min(set ?? max, max));

/** Who's inside right now, leaving out the person asking (their own reload doesn't count) */
export interface InsideNow {
  people: number;
  ownerIn: boolean;
  modsIn: number;
}

/** Is there a seat for someone with this role? (docs/features/02-rooms.md) */
export function hasSeat(capacity: number, role: RoomRole | 'guest', inside: InsideNow): boolean {
  // Their seat is always kept, even after the owner lowers the cap below who's inside
  if (role === 'owner') return true;
  const ownerSeat = inside.ownerIn ? 0 : 1;
  if (role === 'mod') return inside.people < capacity - ownerSeat;
  const modSeat = inside.modsIn > 0 ? 0 : 1;
  return inside.people < capacity - ownerSeat - modSeat;
}

/** Three fixed roles, no custom ones (they're much of why Discord feels complicated). */
export const ROOM_ROLES = ['owner', 'mod', 'member'] as const;
export type RoomRole = (typeof ROOM_ROLES)[number];

/** Can someone with role `me` act on (kick, ban, time out) someone with role `them`? Owner: anyone but
 *  themselves; mod: members only. Guests count as members. */
export function canActOn(me: RoomRole | null | undefined, them: RoomRole): boolean {
  if (me === 'owner') return them !== 'owner';
  if (me === 'mod') return them === 'member';
  return false;
}

export const INVITE_EXPIRIES = ['1d', '7d', 'never'] as const;
export type InviteExpiry = (typeof INVITE_EXPIRIES)[number];
export const INVITE_EXPIRY_HOURS: Record<InviteExpiry, number | null> = { '1d': 24, '7d': 24 * 7, never: null };

export const TIMEOUTS = ['10m', '1h', '1d'] as const;
export type Timeout = (typeof TIMEOUTS)[number];
export const TIMEOUT_MINUTES: Record<Timeout, number> = { '10m': 10, '1h': 60, '1d': 24 * 60 };
