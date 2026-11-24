import type { AvatarLook } from '@connecta/shared';

/** Everything the demo shows. Frontend only: no server, nothing is saved. */

export type Presence = 'online' | 'idle' | 'focus' | 'offline';

export interface User {
  id: string;
  name: string;
  handle: string;
  color: string;
  look: AvatarLook;
  presence: Presence;
  /** What they're doing right now, shown under their name. */
  activity?: string;
  /** Where they are, so friends can join them. */
  inRoom?: { serverId: string; roomId: string };
  /**
   * In a private room you're not a member of. Like Discord, you never learn which room (not its name,
   * map or who else is there), only "in a private room", and you can ask your friend to bring you in.
   */
  inPrivateRoom?: boolean;
  /** For offline friends: "last seen 2h ago". */
  lastSeen?: string;
  plus?: boolean;
}

export const ME: User = {
  id: 'me',
  name: 'feifei',
  handle: 'feifei',
  color: '#df6392',
  look: { hair: '#fff1a8', outfit: '#ff6fa8', accessory: 'catEars' },
  presence: 'online',
  plus: true,
};

export const USERS: Record<string, User> = {
  mai: {
    id: 'mai',
    name: 'Mai',
    handle: 'maimai',
    color: '#7758c4',
    look: { hair: '#a58be8', outfit: '#7c5cff', accessory: 'ribbon' },
    presence: 'focus',
    activity: '📖 Focusing · Calculus',
    inRoom: { serverId: 'chanom', roomId: 'library' },
  },
  jod: {
    id: 'jod',
    name: 'Jod',
    handle: 'jod.dev',
    color: '#e9955a',
    look: { hair: '#46527f', outfit: '#2f80ed', accessory: 'headphones' },
    presence: 'focus',
    activity: '📖 Focusing · Kuy pawa',
    inRoom: { serverId: 'chanom', roomId: 'library' },
    // Has Plus: gifting Jod shows how a gift stacks on top
    plus: true,
  },
  ken: {
    id: 'ken',
    name: 'Ken',
    handle: 'kenken',
    color: '#2f7d55',
    look: { hair: '#34313f', outfit: '#12a37f', accessory: 'glasses' },
    presence: 'online',
    activity: '🎴 Playing Slave',
    inRoom: { serverId: 'cpe', roomId: 'lounge' },
    plus: true,
  },
  ploy: {
    id: 'ploy',
    name: 'Ploy',
    handle: 'ployy',
    color: '#b3612f',
    look: { hair: '#f7b267', outfit: '#ef8a3c', accessory: 'twintails' },
    presence: 'online',
    activity: 'Walking around the Library',
    inRoom: { serverId: 'chanom', roomId: 'library' },
  },
  nam: {
    id: 'nam',
    name: 'Nam',
    handle: 'namwhan',
    color: '#2e6ea8',
    look: { hair: '#c8e3ff', outfit: '#2f80ed', accessory: 'ahoge' },
    presence: 'idle',
    activity: '☕ On a break',
  },
  bow: {
    id: 'bow',
    name: 'Bow',
    handle: 'bowbow',
    color: '#c03a72',
    look: { hair: '#f59ac0', outfit: '#e84855', accessory: 'ribbon' },
    presence: 'offline',
    lastSeen: '2h ago',
  },
  pim: {
    id: 'pim',
    name: 'Pim',
    handle: 'pimmy',
    color: '#7a6a3a',
    look: { hair: '#8fdcc0', outfit: '#12a37f', accessory: 'none' },
    presence: 'offline',
    lastSeen: 'yesterday',
  },
  mook: {
    id: 'mook',
    name: 'Mook',
    handle: 'mookie',
    color: '#b07cc6',
    look: { hair: '#f7d6e6', outfit: '#7c5cff', accessory: 'headphones' },
    presence: 'online',
    activity: 'In a Common room',
    inRoom: { serverId: 'public', roomId: 'cafe-2' },
  },
  earth: {
    id: 'earth',
    name: 'Earth',
    handle: 'earth.k',
    color: '#3f8f6b',
    look: { hair: '#3a3446', outfit: '#2f7de1', accessory: 'glasses' },
    presence: 'online',
    activity: '🎸 Jamming',
    // In a private room you're not in (his band's): you only see "a private room" and "Ask to join"
    inPrivateRoom: true,
  },
};

export type Visibility = 'private' | 'public' | 'request';

export interface Channel {
  id: string;
  name: string;
  topic: string;
  unread?: number;
  mention?: boolean;
}

/**
 * The standard kit (feature 7): every map has every piece, so every activity works in every map.
 * Templates differ only in the place, the props and the theme; `look` says how each piece looks.
 */
export const KIT = [
  { id: 'study', name: 'Study spots', need: '12+ seats (Cosy) · 24+ (Big)' },
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

/** Template ideas we liked, for later (feature 7). Same standard kit, different place. */
export const FUTURE_MAPS = [
  { name: 'Greenhouse', emoji: '🌿', idea: 'Plants, glass roof, a watering-can lamp' },
  { name: 'Bakery Kitchen', emoji: '🥐', idea: 'Flour-dusted counters, oven glow, bread on the shelves' },
  { name: 'Kotatsu House', emoji: '🍊', idea: 'Japanese house, kotatsu tables, snow outside' },
  { name: 'Beach Hut', emoji: '🏖️', idea: 'Wooden deck, waves, hammocks' },
  { name: 'Space Station', emoji: '🚀', idea: 'Round windows on Earth, floating plants' },
];

/** Cosy fits up to 50 people (25 while the owner is on Free); Big fits 100 and needs the owner's Plus. */
export const MAP_SIZES = [
  { id: 'cosy', name: 'Cosy', upTo: 50, plusOnly: false, text: 'Up to 50 people (25 on Free). Every room starts here.' },
  { id: 'big', name: 'Big', upTo: 100, plusOnly: true, text: 'Up to 100 people, more seats and a second lounge.' },
] as const;
export type MapSize = (typeof MAP_SIZES)[number]['id'];

export interface Room {
  id: string;
  name: string;
  mapId: string;
  capacity: number;
  allowGuests: boolean;
  /** Can anyone start games that invite the whole room (Pick a Side)? Tables, TV and board always work. */
  roomWideGames: boolean;
  /** Who's inside right now. */
  people: string[];
  /** Activities happening in the room (for the sidebar). */
  happening?: string;
}

export interface Server {
  id: string;
  name: string;
  emoji: string;
  tint: string;
  banner: string;
  description: string;
  visibility: Visibility;
  members: string[];
  memberCount: number;
  roles: Record<string, 'Owner' | 'Mod'>;
  channels: Channel[];
  rooms: Room[];
  /** The owner has Connecta Plus: the room fits 100 and gets Big and premium maps. */
  ownerPlus?: boolean;
  event?: string;
  /** When you were last there, as shown on Home ("2h ago"). */
  lastActive?: string;
  /** Days since you were last there; Home folds rooms quiet for 30+ days away. */
  idleDays?: number;
}

/** "2 weeks ago" from a number of days. */
export function ago(days: number) {
  if (days < 1) return 'today';
  if (days < 2) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.round(days / 7)} weeks ago`;
  if (days < 365) return `${Math.round(days / 30)} months ago`;
  return 'over a year ago';
}

export interface Message {
  id: string;
  author: string;
  at: string;
  text: string;
  /** The demo's placeholder picture (mock messages). */
  image?: boolean;
  /** Pictures you attached in the demo (object URLs), up to 4. */
  images?: string[];
  reactions?: { emoji: string; count: number; mine?: boolean }[];
  /** The message this one replies to (quoted above it). */
  replyTo?: string;
  edited?: boolean;
  system?: boolean;
  /** A Plus gift (feature 15): shown as a gift card. */
  gift?: { months: number; note?: string };
}

export interface Dm {
  id: string;
  with: string;
  unread?: number;
  /** No longer friends: the history stays, read-only, with a way to add them again. */
  unfriended?: boolean;
  messages: Message[];
}

export const DMS: Dm[] = [
  {
    id: 'mai',
    with: 'mai',
    unread: 2,
    messages: [
      { id: '1', author: 'me', at: '09:12', text: 'are you studying today?' },
      { id: '2', author: 'mai', at: '09:14', text: 'yes!! come to the library, the cat is here 🐱' },
      { id: '3', author: 'mai', at: '09:14', text: 'bring your calculus notes' },
      { id: '4', author: 'mai', at: '09:15', text: '', gift: { months: 1, note: 'for the Big map, thanks for hosting 🫶' } },
    ],
  },
  {
    id: 'jod',
    with: 'jod',
    messages: [
      { id: '1', author: 'jod', at: 'Yesterday', text: 'ok see you at 8' },
      { id: '2', author: 'me', at: 'Yesterday', text: '👍' },
    ],
  },
  // Demo of an unfriended chat
  { id: 'ken', with: 'ken', unfriended: true, messages: [{ id: '1', author: 'ken', at: 'Mon', text: 'gg last night 🎴' }] },
];

/**
 * Common rooms (were "drop-in rooms", renamed 2026-11-09): run by Connecta from its templates, open
 * to everyone, guests included, with no members and no saved chat. When a copy fills, a new one
 * opens (#2, #3). Nobody runs them, so they're safe for strangers by design (feature 14): text only,
 * no voice, pictures, videos or screen share, slow mode, no clickable links.
 */
/** A copy's capacity: never more than this many inside. */
export const COMMON_CAPACITY = 25;
export const COMMON_COPIES = [
  { id: 'library-1', name: 'Library Common Room #1', mapId: 'library', people: 20, roomWideGames: false, vibe: 'Quiet study' },
  { id: 'library-2', name: 'Library Common Room #2', mapId: 'library', people: 6, roomWideGames: false, vibe: 'Quiet study' },
  { id: 'cafe-1', name: 'Cat Café Common Room #1', mapId: 'cafe', people: 17, roomWideGames: true, vibe: 'Chill and chat' },
  { id: 'cafe-2', name: 'Cat Café Common Room #2', mapId: 'cafe', people: 11, roomWideGames: true, vibe: 'Chill and chat' },
  { id: 'rooftop-1', name: 'Starry Rooftop Common Room #1', mapId: 'rooftop', people: 3, roomWideGames: true, vibe: 'Late night talks' },
];

/**
 * Common room copies open like a room with no chats, so the room screen treats them the same way
 * (the demo's stand-in; the port replaces it with a real template + copies model).
 */
export const PUBLIC_SERVER: Server = {
  id: 'public',
  name: 'Common rooms',
  emoji: '🌏',
  tint: 'bg-sky',
  banner: 'from-[#dfeeff] via-[#e3f5ea] to-[#efe4ff]',
  description: 'Run by Connecta, open to everyone. Text only. Be kind.',
  visibility: 'public',
  members: [],
  memberCount: 0,
  roles: {},
  channels: [],
  rooms: COMMON_COPIES.map((r) => ({
    id: r.id,
    name: r.name,
    mapId: r.mapId,
    capacity: COMMON_CAPACITY,
    allowGuests: true,
    roomWideGames: r.roomWideGames,
    // Someone is in one copy at a time; the copies' head counts are mostly strangers
    people: r.id === 'cafe-2' ? ['mook', 'pim'] : r.id === 'library-1' ? ['bow'] : [],
    happening: r.vibe,
  })),
};

/**
 * Common rooms as people see them: one card per template, counting everyone across its copies.
 * Drop in lands you in the copy with the most friends, otherwise the busiest one with space (busy
 * feels alive). Joining a friend from Home or Friends lands in that friend's copy.
 */
export interface CommonRoom {
  id: string;
  name: string;
  mapId: string;
  vibe: string;
  roomWideGames: boolean;
  /** Everyone across all copies right now. */
  here: number;
  copies: number;
  friendsInside?: string[];
}
