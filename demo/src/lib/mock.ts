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
  },
  pim: {
    id: 'pim',
    name: 'Pim',
    handle: 'pimmy',
    color: '#7a6a3a',
    look: { hair: '#8fdcc0', outfit: '#12a37f', accessory: 'none' },
    presence: 'offline',
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

export interface MapTemplate {
  id: string;
  name: string;
  emoji: string;
  blurb: string;
  zones: string[];
  tint: string;
}

export const MAPS: MapTemplate[] = [
  {
    id: 'library',
    name: 'Cosy Library',
    emoji: '📚',
    blurb: 'Six study tables, a reading nook with a sofa, warm lamps.',
    zones: ['Study tables', 'Reading nook', 'Buddy Machine'],
    tint: 'bg-lavender',
  },
  {
    id: 'cafe',
    name: 'Milk Tea Café',
    emoji: '☕',
    blurb: 'Café tables, a jukebox corner and a big TV for watching together.',
    zones: ['Café tables', 'Jukebox', 'TV corner', 'Card table'],
    tint: 'bg-peach',
  },
  {
    id: 'rooftop',
    name: 'Night Rooftop',
    emoji: '🌙',
    blurb: 'Fairy lights, beanbags, a campfire circle and a whiteboard wall.',
    zones: ['Campfire circle', 'Whiteboard wall', 'Stargazing deck'],
    tint: 'bg-sky',
  },
];

export interface Room {
  id: string;
  name: string;
  mapId: string;
  capacity: number;
  allowGuests: boolean;
  quiet: boolean;
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
  boosted?: number;
  event?: string;
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
        quiet: true,
        people: ['mai', 'jod', 'ploy'],
        happening: '2 focusing',
      },
      { id: 'cafe', name: 'Café', mapId: 'cafe', capacity: 15, allowGuests: true, quiet: false, people: [] },
      { id: 'rooftop', name: 'Rooftop', mapId: 'rooftop', capacity: 15, allowGuests: false, quiet: false, people: [] },
    ],
    boosted: 2,
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
    roles: { ken: 'Owner' },
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
        quiet: true,
        people: ['nam', 'pim'],
        happening: '14 focusing',
      },
      {
        id: 'lounge',
        name: 'Lounge',
        mapId: 'cafe',
        capacity: 20,
        allowGuests: false,
        quiet: false,
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
      { id: 'rooftop', name: 'Rooftop', mapId: 'rooftop', capacity: 25, allowGuests: true, quiet: false, people: [] },
      { id: 'cafe', name: 'Café', mapId: 'cafe', capacity: 25, allowGuests: true, quiet: false, people: [] },
    ],
    event: 'Drawing telephone · Sat 21:00',
  },
];

export const serverById = (id: string) => (id === PUBLIC_SERVER.id ? PUBLIC_SERVER : SERVERS.find((s) => s.id === id));

export interface Message {
  id: string;
  author: string;
  at: string;
  text: string;
  image?: boolean;
  reactions?: { emoji: string; count: number; mine?: boolean }[];
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
  { id: 'ken', with: 'ken', messages: [{ id: '1', author: 'ken', at: 'Mon', text: 'gg last night 🎴' }] },
];

export const FRIEND_REQUESTS = [{ id: 'bow', incoming: true }];

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

export const PUBLIC_ROOMS = [
  { id: 'silent-library-1', name: 'Silent Library #1', mapId: 'library', people: 18, capacity: 20, quiet: true, vibe: 'Silent study' },
  { id: 'silent-library-2', name: 'Silent Library #2', mapId: 'library', people: 6, capacity: 20, quiet: true, vibe: 'Silent study' },
  { id: 'cafe-lounge-1', name: 'Café Lounge #1', mapId: 'cafe', people: 11, capacity: 20, quiet: false, vibe: 'Chill and chat' },
  { id: 'rooftop-1', name: 'Night Rooftop #1', mapId: 'rooftop', people: 3, capacity: 20, quiet: false, vibe: 'Late night talks' },
];

/**
 * Public rooms aren't in anyone's server: they're copies of platform templates. In the app they open
 * like a server with no chats, so the room screen can treat them the same way.
 */
export const PUBLIC_SERVER: Server = {
  id: 'public',
  name: 'Public rooms',
  emoji: '🌏',
  tint: 'bg-sky',
  banner: 'from-[#dfeeff] via-[#e3f5ea] to-[#efe4ff]',
  description: 'Open to everyone. Be kind.',
  visibility: 'public',
  members: [],
  memberCount: 0,
  roles: {},
  channels: [],
  rooms: PUBLIC_ROOMS.map((r) => ({
    id: r.id,
    name: r.name,
    mapId: r.mapId,
    capacity: r.capacity,
    allowGuests: true,
    quiet: r.quiet,
    people: ['bow', 'pim'],
    happening: r.vibe,
  })),
};

export const DISCOVER = [
  {
    id: 'gamenight',
    name: 'Game Night Club',
    emoji: '🎴',
    tint: 'bg-mint',
    members: 230,
    online: 41,
    tags: ['Games', 'Werewolf'],
    blurb: 'Werewolf, cards and drawing games every weekend.',
  },
  {
    id: 'lofi-study',
    name: 'Lo-fi Study Hall',
    emoji: '🎧',
    tint: 'bg-lavender',
    members: 1840,
    online: 212,
    tags: ['Study', 'Quiet'],
    blurb: 'Silent study rooms all day, group sprints every hour.',
  },
  {
    id: 'anime-club',
    name: 'Anime Club TH',
    emoji: '🌸',
    tint: 'bg-secondary',
    members: 920,
    online: 88,
    tags: ['Anime', 'Watch party'],
    blurb: 'Weekly watch parties on the big TV.',
  },
  {
    id: 'ielts',
    name: 'IELTS Speaking Café',
    emoji: '🗣️',
    tint: 'bg-peach',
    members: 410,
    online: 23,
    tags: ['Language', 'Voice'],
    blurb: 'Practise speaking in small tables. Request to join.',
  },
];
