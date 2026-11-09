import type { AvatarLook } from '@study/shared';

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

export const userById = (id: string): User => (id === 'me' ? ME : (USERS[id] ?? ME));

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
    blurb: 'Study tables under warm lamps, tall bookshelves and a reading nook with a sofa.',
    mood: 'Quiet focus, rain on the windows',
    zones: ['Study tables', 'Reading nook', 'Buddy Machine'],
    tint: 'bg-lavender',
    look: {
      study: 'Study tables with green lamps',
      lounge: 'The sofa by the shelves',
      private: 'Reading nook, map-room alcove',
      screen: 'Pull-down projector screen',
      games: 'Chess table',
      floor: 'The rug in the middle',
      whiteboard: 'Chalkboard on a stand',
      buddy: 'Buddy Machine by the door',
      nap: 'Cushions on the sofa arms',
      spawn: 'The front door',
    },
  },
  {
    id: 'cafe',
    name: 'Cat Café',
    emoji: '🐈',
    blurb: 'Café tables, cats everywhere and a big TV for watching together.',
    mood: 'Warm, chatty, a cat on every chair',
    zones: ['Café tables', 'Cat tower', 'TV corner', 'Card table'],
    tint: 'bg-peach',
    look: {
      study: 'Café tables and a window counter',
      lounge: 'Beanbags by the cat tower',
      private: 'Booths by the window',
      screen: 'TV on the wall',
      games: 'Card table',
      floor: 'Open space by the counter',
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
  /** How many are inside right now when it's more than the named people (crowds, a full room). */
  insideCount?: number;
  /** When you were last there, as shown on Home ("2h ago"). */
  lastActive?: string;
  /** Days since you were last there; Home folds rooms quiet for 30+ days away. */
  idleDays?: number;
}

export const SERVERS: Server[] = [
  {
    id: 'chanom',
    name: 'Chanom Friends',
    emoji: '🍓',
    tint: 'bg-secondary',
    banner: 'from-[#ffd6e5] via-[#ffe9d6] to-[#efe4ff]',
    description: 'Our little corner. Study, chill, play cards on Friday.',
    visibility: 'private',
    members: ['me', 'mai', 'jod', 'ploy', 'nam', 'bow', 'pim'],
    memberCount: 9,
    roles: { me: 'Owner', mai: 'Mod' },
    channels: [
      { id: 'general', name: 'general', topic: 'Anything goes ✨', unread: 3, mention: true },
      { id: 'study-notes', name: 'study-notes', topic: 'Share notes and summaries' },
      { id: 'memes', name: 'memes', topic: 'Cat pictures mostly', unread: 1 },
    ],
    rooms: [
      {
        id: 'library',
        name: 'Library',
        mapId: 'library',
        capacity: 20,
        allowGuests: false,
        roomWideGames: true,
        people: ['mai', 'jod', 'ploy'],
        happening: '2 focusing',
      },
      { id: 'cafe', name: 'Café', mapId: 'cafe', capacity: 15, allowGuests: true, roomWideGames: true, people: [] },
      { id: 'rooftop', name: 'Rooftop', mapId: 'rooftop', capacity: 15, allowGuests: false, roomWideGames: true, people: [] },
    ],
    ownerPlus: true,
    event: 'Werewolf night · Fri 20:00',
  },
  {
    id: 'cpe',
    name: 'CPE Year 3',
    emoji: '📐',
    tint: 'bg-lavender',
    banner: 'from-[#e6ddff] via-[#dfeeff] to-[#e3f5ea]',
    description: 'Computer Engineering, class of 2027. Exam season survival.',
    visibility: 'request',
    members: ['me', 'ken', 'nam', 'pim'],
    memberCount: 64,
    // You're a mod here: shows the mod view of Room settings and the join-request badge
    roles: { ken: 'Owner', me: 'Mod' },
    // Exam season: the free 25 are all inside, so it shows as full
    insideCount: 25,
    lastActive: 'yesterday',
    idleDays: 1,
    channels: [
      { id: 'announcements', name: 'announcements', topic: 'Deadlines and exam rooms' },
      { id: 'general', name: 'general', topic: 'Chat', unread: 12 },
      { id: 'os-course', name: 'os-course', topic: 'Operating Systems, sec 2' },
    ],
    rooms: [
      {
        id: 'exam-hall',
        name: 'Exam Hall',
        mapId: 'library',
        capacity: 30,
        allowGuests: false,
        roomWideGames: false,
        people: ['nam', 'pim'],
        happening: '14 focusing',
      },
      {
        id: 'lounge',
        name: 'Lounge',
        mapId: 'cafe',
        capacity: 20,
        allowGuests: false,
        roomWideGames: true,
        people: ['ken'],
        happening: 'Slave at the card table',
      },
    ],
  },
  {
    id: 'gamenight',
    name: 'Game Night Club',
    emoji: '🎴',
    tint: 'bg-mint',
    banner: 'from-[#d9f5e3] via-[#fff3d6] to-[#ffe0ec]',
    description: 'Werewolf, cards and drawing games every weekend. Everyone welcome!',
    visibility: 'public',
    members: ['me', 'ploy', 'bow'],
    memberCount: 230,
    roles: {},
    channels: [
      { id: 'lobby', name: 'lobby', topic: 'Say hi 👋' },
      { id: 'looking-for-game', name: 'looking-for-game', topic: 'Find players' },
    ],
    rooms: [
      { id: 'rooftop', name: 'Rooftop', mapId: 'rooftop', capacity: 25, allowGuests: true, roomWideGames: true, people: [] },
      { id: 'cafe', name: 'Café', mapId: 'cafe', capacity: 25, allowGuests: true, roomWideGames: true, people: [] },
    ],
    event: 'Draw & Guess · Sat 21:00',
    lastActive: '3 days ago',
    idleDays: 3,
  },
  ...extraRooms(),
];

/**
 * More rooms you're in, so Home shows what a long list looks like. They borrow the chat and map
 * plumbing of a real mock room; only the name, look and who's there differ.
 */
function extraRooms(): Server[] {
  const rows: [string, string, string, string, string, 'Owner' | 'Mod' | null, number, number][] = [
    ['study-sprint', 'Study Sprint Squad', '⏱️', 'bg-peach', 'library', 'Owner', 0, 0],
    ['ielts-buddies', 'IELTS Buddies', '🗣️', 'bg-sky', 'cafe', null, 2, 0],
    ['band', 'Band Practice', '🎸', 'bg-mint', 'rooftop', null, 0, 2],
    ['family', 'Family Room', '🏠', 'bg-secondary', 'cafe', 'Owner', 0, 3],
    ['manga', 'Manga Club', '📖', 'bg-lavender', 'library', 'Mod', 1, 7],
    ['dorm-3b', 'Dorm 3B', '🛏️', 'bg-peach', 'rooftop', null, 0, 9],
    ['cpe-lab', 'CPE Lab Group 4', '🧪', 'bg-sky', 'library', null, 0, 14],
    ['werewolf', 'Werewolf Fridays', '🐺', 'bg-lavender', 'rooftop', null, 3, 21],
  ];
  return rows.map(([id, name, emoji, tint, mapId, role, inside, idleDays]) =>
    lightRoom(id, name, emoji, tint, mapId, role, inside, idleDays),
  );
}

/** "2 weeks ago" from a number of days, for the mock rooms. (A function, so SERVERS can use it before this line.) */
export function ago(days: number) {
  if (days < 1) return 'today';
  if (days < 2) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.round(days / 7)} weeks ago`;
  if (days < 365) return `${Math.round(days / 30)} months ago`;
  return 'over a year ago';
}

function lightRoom(
  id: string,
  name: string,
  emoji: string,
  tint: string,
  mapId: string,
  role: 'Owner' | 'Mod' | null,
  inside: number,
  idleDays: number,
): Server {
  return {
    id,
    name,
    emoji,
    tint,
    banner: 'from-[#ffe9d6] via-[#efe4ff] to-[#dfeeff]',
    description: `${name}. Come hang out.`,
    visibility: 'private' as const,
    members: ['me', 'nam', 'pim'],
    memberCount: 6 + name.length,
    roles: (role ? { me: role } : {}) as Server['roles'],
    channels: [{ id: 'chat', name: 'chat', topic: '' }],
    rooms: [{ id: mapId, name: 'Main', mapId, capacity: 25, allowGuests: false, roomWideGames: true, people: [] }],
    insideCount: inside,
    lastActive: ago(idleDays),
    idleDays,
  };
}

/**
 * Demo only ("Lots of rooms" in the Demo tab): 89 more rooms, so Home can be judged at 100. Most
 * haven't been visited in a while, like a real long list.
 */
export const MANY_ROOMS: Server[] = (() => {
  const a = ['Cosy', 'Midnight', 'Sunday', 'Rainy', 'Tiny', 'Secret', 'Lazy', 'Golden', 'Quiet', 'Loud', 'Matcha', 'Strawberry', 'Thai'];
  const b = [
    'Study Club',
    'Book Nook',
    'Gamers',
    'Art Room',
    'Music Lab',
    'Movie Night',
    'Debate Team',
    'Coders',
    'Crew',
    'Lounge',
    'Squad',
  ];
  const emojis = ['📚', '🎮', '🎨', '🎵', '🍿', '💬', '💻', '☕', '🌙', '🍓', '🧋', '🐱'];
  const tints = ['bg-peach', 'bg-sky', 'bg-mint', 'bg-lavender', 'bg-secondary'];
  const maps = ['library', 'cafe', 'rooftop'];
  return Array.from({ length: 89 }, (_, i) =>
    lightRoom(
      `room-${i}`,
      `${a[i % a.length]} ${b[(i * 7) % b.length]}${i >= a.length * 3 ? ` ${Math.floor(i / 13)}` : ''}`,
      emojis[i % emojis.length]!,
      tints[i % tints.length]!,
      maps[i % maps.length]!,
      i % 17 === 0 ? 'Owner' : i % 11 === 0 ? 'Mod' : null,
      i % 9 === 0 ? (i % 5) + 1 : 0,
      // A few recent, most quiet for weeks or months
      i < 12 ? i : 20 + ((i * 37) % 300),
    ),
  );
})();

export const serverById = (id: string) =>
  id === PUBLIC_SERVER.id ? PUBLIC_SERVER : (SERVERS.find((s) => s.id === id) ?? MANY_ROOMS.find((s) => s.id === id));

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
}

export const CHANNEL_MESSAGES: Record<string, Message[]> = {
  'chanom/general': [
    { id: '1', author: 'ploy', at: 'Today 20:41', text: "who's free friday? werewolf night 🐺" },
    { id: '2', author: 'ken', at: 'Today 20:43', text: '@feifei you coming?', reactions: [{ emoji: '👀', count: 2 }] },
    {
      id: '3',
      author: 'mai',
      at: 'Today 20:44',
      text: "yes!! I'll bring snacks (virtually)",
      reactions: [{ emoji: '🍪', count: 3, mine: true }],
    },
    { id: '4', author: 'jod', at: 'Today 20:50', text: 'the library is so cosy tonight, come study', image: true },
    { id: '5', author: 'pim', at: 'Today 20:52', text: 'anyone want to buy my notes? dm me' },
    { id: '6', author: 'nam', at: 'Today 20:55', text: 'me!! 🙋 count me in for friday', replyTo: '1', edited: true },
  ],
  'chanom/study-notes': [
    { id: '1', author: 'nam', at: 'Yesterday 18:02', text: 'Calculus II chapter 7 summary 📌 (integration by parts, partial fractions)' },
    { id: '2', author: 'jod', at: 'Yesterday 18:10', text: 'thank youuu', reactions: [{ emoji: '💖', count: 4 }] },
  ],
  'chanom/memes': [{ id: '1', author: 'bow', at: 'Today 13:37', text: 'when the cat sits on your desk mid-pomodoro', image: true }],
};

export const channelMessages = (serverId: string, channelId: string): Message[] =>
  CHANNEL_MESSAGES[`${serverId}/${channelId}`] ?? [
    { id: 'w', author: 'me', at: 'Today', text: `This is the start of #${channelId}. Say hi 👋`, system: true },
  ];

export interface Dm {
  id: string;
  with: string;
  unread?: number;
  /** No longer friends: the history stays, read-only, with a way to add them again. */
  unfriended?: boolean;
  messages: Message[];
}

/** People you've blocked: their DM is hidden and their room messages fold away (demo: Pim). */
export const BLOCKED = new Set(['pim']);

export const DMS: Dm[] = [
  {
    id: 'mai',
    with: 'mai',
    unread: 2,
    messages: [
      { id: '1', author: 'me', at: '09:12', text: 'are you studying today?' },
      { id: '2', author: 'mai', at: '09:14', text: 'yes!! come to the library, the cat is here 🐱' },
      { id: '3', author: 'mai', at: '09:14', text: 'bring your calculus notes' },
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

export const FRIEND_REQUESTS = [{ id: 'bow', incoming: true }];

/** Requests you sent that haven't been answered (ignoring is silent, so they just wait; they expire after 30 days). */
export const SENT_REQUESTS = [{ handle: 'tonkla_', name: 'Tonkla', color: '#6aa6ff', at: '3 days ago' }];

/**
 * Your friends in the demo: everyone except Bow (asked you, not answered yet), Pim (blocked) and Ken
 * (unfriended, see his DM).
 */
export const FRIENDS = Object.values(USERS).filter((u) => !['bow', 'pim', 'ken'].includes(u.id));

export type ShopCategory = 'outfits' | 'accessories' | 'pets' | 'frames';

export interface ShopItem {
  id: string;
  name: string;
  category: ShopCategory;
  emoji: string;
  price: number;
  tint: string;
  owned?: boolean;
  plusOnly?: boolean;
  isNew?: boolean;
}

export const SHOP: ShopItem[] = [
  { id: 'strawberry-dress', name: 'Strawberry Dress', category: 'outfits', emoji: '🍓', price: 300, tint: 'bg-secondary', isNew: true },
  { id: 'matcha-hoodie', name: 'Matcha Hoodie', category: 'outfits', emoji: '🍵', price: 280, tint: 'bg-mint' },
  { id: 'starry-pajamas', name: 'Starry Pajamas', category: 'outfits', emoji: '🌙', price: 350, tint: 'bg-lavender', plusOnly: true },
  { id: 'school-uniform', name: 'School Uniform', category: 'outfits', emoji: '🎒', price: 200, tint: 'bg-sky', owned: true },
  { id: 'bunny-ears', name: 'Bunny Ears', category: 'accessories', emoji: '🐰', price: 150, tint: 'bg-secondary' },
  { id: 'flower-crown', name: 'Flower Crown', category: 'accessories', emoji: '🌸', price: 180, tint: 'bg-peach', isNew: true },
  { id: 'round-glasses', name: 'Round Glasses', category: 'accessories', emoji: '👓', price: 90, tint: 'bg-lavender', owned: true },
  { id: 'cat-ears', name: 'Cat Ears', category: 'accessories', emoji: '🐱', price: 120, tint: 'bg-mint', owned: true },
  { id: 'pet-cat', name: 'Pet Kitten', category: 'pets', emoji: '🐈', price: 500, tint: 'bg-peach' },
  { id: 'pet-duck', name: 'Pet Duckling', category: 'pets', emoji: '🐥', price: 450, tint: 'bg-mint', isNew: true },
  { id: 'pet-bunny', name: 'Pet Bunny', category: 'pets', emoji: '🐇', price: 520, tint: 'bg-lavender', plusOnly: true },
  { id: 'frame-sakura', name: 'Sakura Photo Frame', category: 'frames', emoji: '🌸', price: 100, tint: 'bg-secondary' },
  { id: 'frame-polaroid', name: 'Polaroid Frame', category: 'frames', emoji: '📸', price: 80, tint: 'bg-sky', owned: true },
];

export const COINS = 1240;

/**
 * Common rooms (were "drop-in rooms", renamed 2026-11-09): run by Connecta from its templates, open
 * to everyone, guests included, with no members and no saved chat. When a copy fills, a new one
 * opens (#2, #3). Nobody runs them, so they're safe for strangers by design (feature 14): text only,
 * no voice, pictures, videos or screen share, slow mode, no clickable links, no Werewolf.
 */
/** A copy's capacity: never more than this many inside. */
export const COMMON_CAPACITY = 25;
/** Seats kept free for people joining a friend: Walk in stops placing strangers at 25 − 5 = 20. */
export const COMMON_FRIEND_SEATS = 5;
const STRANGERS_UP_TO = COMMON_CAPACITY - COMMON_FRIEND_SEATS;

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
    people: r.id === 'cafe-2' ? ['mook', 'pim'] : ['bow', 'pim'],
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

export const COMMON_ROOMS: CommonRoom[] = [
  { id: 'library', name: 'Library', mapId: 'library', vibe: 'Quiet study · text only', roomWideGames: false, here: 142, copies: 8 },
  {
    id: 'cafe',
    name: 'Cat Café',
    mapId: 'cafe',
    vibe: 'Chill and chat · text only',
    roomWideGames: true,
    here: 57,
    copies: 3,
    friendsInside: ['mook'],
  },
  {
    id: 'rooftop',
    name: 'Starry Rooftop',
    mapId: 'rooftop',
    vibe: 'Late night talks · text only',
    roomWideGames: true,
    here: 3,
    copies: 1,
  },
];

/** Which copy Walk in lands you in: your friends' copy (any free seat), else the busiest one still taking strangers. */
export function commonCopyFor(mapId: string): string {
  const copies = COMMON_COPIES.filter((c) => c.mapId === mapId);
  const withFriend = PUBLIC_SERVER.rooms.find(
    (r) =>
      r.mapId === mapId &&
      r.people.some((id) => FRIENDS.some((f) => f.id === id)) &&
      copies.find((c) => c.id === r.id)!.people < COMMON_CAPACITY,
  );
  if (withFriend) return withFriend.id;
  const open = copies.filter((c) => c.people < STRANGERS_UP_TO).sort((a, b) => b.people - a.people);
  return (open[0] ?? copies[0]!).id;
}

/**
 * Open rooms: rooms people made and set to Open, so anyone can walk in (and join as a member).
 * Unlike Common rooms they have an owner, members and a saved chat, and one copy only: full is full.
 */
export interface OpenRoom {
  id: string;
  name: string;
  emoji: string;
  tint: string;
  mapId: string;
  owner: string;
  members: number;
  inside: number;
  capacity: number;
  /** From the fixed list (Overview → Tags and language), up to 3. */
  tags: string[];
  language: string;
  blurb: string;
  /** Members must be approved ("Ask to join"); still listed so people can find it. */
  ask?: boolean;
  friendsInside?: string[];
}

export const OPEN_ROOMS: OpenRoom[] = [
  {
    id: 'gamenight',
    name: 'Game Night Club',
    emoji: '🎴',
    tint: 'bg-mint',
    mapId: 'rooftop',
    owner: 'Bow',
    members: 230,
    inside: 41,
    capacity: 50,
    tags: ['Games', 'Late night'],
    language: 'Thai',
    blurb: 'Werewolf, cards and drawing games every weekend.',
    friendsInside: ['ploy'],
  },
  {
    id: 'lofi-study',
    name: 'Lo-fi Study Hall',
    emoji: '🎧',
    tint: 'bg-lavender',
    mapId: 'library',
    owner: 'Studyhall',
    members: 980,
    inside: 96,
    capacity: 100,
    tags: ['Study'],
    language: 'English',
    blurb: 'Silent study all day, group sprints every hour.',
  },
  {
    id: 'anime-club',
    name: 'Anime Club TH',
    emoji: '🌸',
    tint: 'bg-secondary',
    mapId: 'cafe',
    owner: 'Fern',
    members: 920,
    inside: 50,
    capacity: 50,
    tags: ['Anime', 'Chill'],
    language: 'Thai',
    blurb: 'Weekly watch parties on the big TV.',
  },
  {
    id: 'ielts',
    name: 'IELTS Speaking Café',
    emoji: '🗣️',
    tint: 'bg-peach',
    mapId: 'cafe',
    owner: 'Teacher Ann',
    members: 410,
    inside: 9,
    capacity: 25,
    tags: ['Language exchange'],
    language: 'English',
    blurb: 'Practise speaking in small tables.',
    ask: true,
  },
];
