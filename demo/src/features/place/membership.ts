/**
 * Membership mock data for the room settings (feature 3): join requests, bans and invite links.
 * API-shaped so it can become the real schema; people outside the mock friend list carry their own
 * name and colour.
 */

export type RoomRole = 'Owner' | 'Mod' | 'Member';

/** What each role can do. Three fixed roles, no custom ones (keeps rooms simple). */
export const ROLE_RULES: { role: RoomRole; can: string[]; cannot?: string[] }[] = [
  {
    role: 'Owner',
    can: ['Everything below', 'Change the map, visibility and name', 'Make or remove mods', 'Hand the room over or delete it'],
  },
  {
    role: 'Mod',
    can: [
      'Kick, ban and time out members and guests',
      'Approve join requests',
      'Make and cancel invite links',
      'Delete messages',
      'Change the safety settings',
    ],
    cannot: ['Act on the owner or other mods', 'Change the map or visibility'],
  },
  { role: 'Member', can: ['Chat and walk in', 'Invite people, if the room allows it'] },
];

export interface Outsider {
  name: string;
  color: string;
}

export interface JoinRequest {
  id: string;
  who: Outsider;
  note?: string;
  /** Shown as-is ("2h ago"). */
  at: string;
  /** Who they already know here, so mods can tell who they are. */
  mutual?: string;
}

export interface RoomBan {
  id: string;
  who: Outsider;
  by: string;
  reason?: string;
  at: string;
}

export interface InviteLink {
  code: string;
  kind: 'member' | 'guest';
  by: string;
  uses: number;
  maxUses: number | null;
  /** "in 6 days", "in 23 h", "never" */
  expires: string;
}

export const JOIN_REQUESTS: JoinRequest[] = [
  {
    id: 'r1',
    who: { name: 'Tonkla', color: '#6aa6ff' },
    note: 'I’m in Mai’s calculus class 👋',
    at: '20 min ago',
    mutual: 'Friends with Mai and Ken',
  },
  { id: 'r2', who: { name: 'Fah', color: '#ff9db8' }, note: 'Saw you on Discover, love the café map!', at: '2h ago' },
  { id: 'r3', who: { name: 'Benz', color: '#8fdcc0' }, at: 'Yesterday' },
];

export const BANS: RoomBan[] = [
  { id: 'b1', who: { name: 'xX_spam_Xx', color: '#9c8aa0' }, by: 'Mai', reason: 'Spamming links', at: '3 days ago' },
];

export const INVITE_LINKS: InviteLink[] = [
  { code: 'k3y9', kind: 'member', by: 'feifei', uses: 4, maxUses: null, expires: 'in 6 days' },
  { code: 'p2ql', kind: 'member', by: 'Mai', uses: 9, maxUses: 10, expires: 'in 2 days' },
  { code: 'g7aa', kind: 'guest', by: 'feifei', uses: 2, maxUses: null, expires: 'in 23 h' },
];

export const EXPIRY_OPTIONS = [
  ['1d', '1 day'],
  ['7d', '7 days'],
  ['never', 'Never'],
] as const;

export const USE_OPTIONS = [
  ['0', 'No limit'],
  ['1', '1 use'],
  ['5', '5 uses'],
  ['10', '10 uses'],
  ['25', '25 uses'],
] as const;

export const TIMEOUTS = [
  ['10m', '10 minutes'],
  ['1h', '1 hour'],
  ['1d', '1 day'],
] as const;

/** A declined person can ask again after this many days. */
export const REQUEST_COOLDOWN_DAYS = 7;
