/**
 * Mock data for the admin site (feature 14): what the Connecta team sees. API-shaped, like the rest
 * of the demo's mocks, so it can become the admin API's schema.
 */

export interface Stat {
  label: string;
  value: string;
  note: string;
  tone?: 'warn' | 'ok';
}

export const STATS: Stat[] = [
  { label: 'Online now', value: '1,284', note: '+12% on last Monday' },
  { label: 'In rooms now', value: '213', note: '186 private · 15 open · 12 Common copies' },
  { label: 'Open reports', value: '7', note: '2 urgent', tone: 'warn' },
  { label: 'Sign-ups today', value: '86', note: '9 under 18' },
  { label: 'Plus subscribers', value: '412', note: '+6 this week' },
  { label: 'AI decks today', value: '338', note: 'of the 3/30 a-day limits' },
];

export interface Health {
  name: string;
  status: 'ok' | 'warn' | 'down';
  detail: string;
}

export const HEALTH: Health[] = [
  { name: 'Game servers', status: 'ok', detail: '3 of 3 · 213 rooms' },
  { name: 'Voice (LiveKit)', status: 'ok', detail: '412 tracks · 38 ms' },
  { name: 'Chat gateway', status: 'ok', detail: '1,190 sockets' },
  { name: 'Database', status: 'ok', detail: 'p95 query 9 ms' },
  { name: 'Errors', status: 'warn', detail: '0.8% (5 min) · join timeouts' },
  { name: 'Moderation API', status: 'ok', detail: 'OpenAI · free tier' },
];

export type ReportTarget = 'person' | 'room' | 'message' | 'picture';
export type ReportStatus = 'open' | 'done';

export interface Report {
  id: string;
  target: ReportTarget;
  /** Who or what was reported. */
  name: string;
  handle?: string;
  reason: string;
  details?: string;
  /** Different accounts that reported it. */
  reporters: number;
  where: string;
  at: string;
  urgent?: boolean;
  /** What the automatic layers already did. */
  auto?: string;
  /** Recent messages around it, for context. */
  context: { who: string; text: string; flagged?: boolean }[];
  /** Earlier actions on this account or room. */
  history: string[];
  status: ReportStatus;
  outcome?: string;
}

export const REPORTS: Report[] = [
  {
    id: 'r1',
    target: 'person',
    name: 'xx_toxic',
    handle: 'xx_toxic',
    reason: 'Harassment',
    details: 'Keeps following one girl around and saying stuff in bubbles',
    reporters: 5,
    where: 'Cat Café Common Room #1',
    at: '4 min ago',
    urgent: true,
    auto: 'Out of Common rooms for 1 h (5 reports in 30 min)',
    context: [
      { who: 'mintchoc', text: 'anyone doing the calculus hw' },
      { who: 'xx_toxic', text: 'u look lonely come sit with me', flagged: true },
      { who: 'mintchoc', text: 'no thanks' },
      { who: 'xx_toxic', text: 'why so rude lol ur ugly anyway', flagged: true },
      { who: 'ppunn', text: 'leave her alone' },
    ],
    history: ['Warned 3 days ago (rude words)'],
    status: 'open',
  },
  {
    id: 'r2',
    target: 'picture',
    name: 'A picture in Garage Band’s chat',
    reason: 'Nudity or sexual',
    reporters: 2,
    where: 'Garage Band · Room chat',
    at: '12 min ago',
    urgent: true,
    auto: 'Hidden: the picture check scored it 0.91 sexual',
    context: [
      { who: 'drumz', text: 'lol look what i found' },
      { who: 'drumz', text: '[picture, hidden]', flagged: true },
    ],
    history: [],
    status: 'open',
  },
  {
    id: 'r3',
    target: 'room',
    name: 'FREE ROBUX GIVEAWAY',
    reason: 'Spam or a scam',
    details: 'Description says to DM for free robux and sends a link',
    reporters: 3,
    where: 'Open room · listed in Discover',
    at: '35 min ago',
    context: [{ who: 'room description', text: 'FREE ROBUX!!! dm owner for code 👉 robux-free.top', flagged: true }],
    history: ['Owner account is 2 days old'],
    status: 'open',
  },
  {
    id: 'r4',
    target: 'message',
    name: 'Message by noodle.boi',
    handle: 'noodle.boi',
    reason: 'Hate speech',
    reporters: 1,
    where: 'Anime Club TH · Room chat',
    at: '1 h ago',
    context: [
      { who: 'fern', text: 'next week: frieren ep 12' },
      { who: 'noodle.boi', text: '[a slur, filtered]', flagged: true },
    ],
    history: [],
    status: 'open',
  },
  {
    id: 'r5',
    target: 'person',
    name: 'Guest Moo',
    reason: 'Spam',
    reporters: 3,
    where: 'Library Common Room #1',
    at: '2 h ago',
    auto: 'Muted 15 min (3 reports in 10 min)',
    context: [
      { who: 'Guest Moo', text: 'aaaaaaaaaaaa', flagged: true },
      { who: 'Guest Moo', text: 'aaaaaaaaaaaaaaaa', flagged: true },
    ],
    history: [],
    status: 'open',
  },
  {
    id: 'r6',
    target: 'person',
    name: 'karaoke_king',
    handle: 'karaoke_king',
    reason: 'Loud or annoying in voice',
    reporters: 1,
    where: 'IELTS Speaking Café',
    at: '3 h ago',
    context: [],
    history: [],
    status: 'open',
  },
  {
    id: 'r7',
    target: 'room',
    name: 'Dorm 3B',
    reason: 'Its name or picture',
    reporters: 1,
    where: 'Private room',
    at: '5 h ago',
    context: [{ who: 'room picture', text: 'A meme with a swear word' }],
    history: [],
    status: 'open',
  },
  {
    id: 'r8',
    target: 'person',
    name: 'spam_bot_44',
    handle: 'spam_bot_44',
    reason: 'Spam or a scam',
    reporters: 4,
    where: 'Cat Café Common Room #2',
    at: 'Yesterday',
    context: [],
    history: [],
    status: 'done',
    outcome: 'Banned by Chanom (team) · Yesterday 21:14',
  },
];

export type AccountStatus = 'active' | 'warned' | 'suspended' | 'banned';

export interface Account {
  id: string;
  name: string;
  handle: string;
  joined: string;
  age: 'under 18' | '18+';
  plus: boolean;
  status: AccountStatus;
  statusNote?: string;
  reports: number;
  rooms: number;
  lastSeen: string;
  signIn: string;
}

export const ACCOUNTS: Account[] = [
  {
    id: 'u1',
    name: 'feifei',
    handle: 'feifei',
    joined: '2 Nov 2026',
    age: '18+',
    plus: true,
    status: 'active',
    reports: 0,
    rooms: 3,
    lastSeen: 'now',
    signIn: 'Google',
  },
  {
    id: 'u2',
    name: 'Mai',
    handle: 'maimai',
    joined: '3 Nov 2026',
    age: '18+',
    plus: false,
    status: 'active',
    reports: 0,
    rooms: 1,
    lastSeen: 'now',
    signIn: 'Discord',
  },
  {
    id: 'u3',
    name: 'xx_toxic',
    handle: 'xx_toxic',
    joined: '5 Nov 2026',
    age: 'under 18',
    plus: false,
    status: 'warned',
    statusNote: 'Warned 3 days ago',
    reports: 9,
    rooms: 0,
    lastSeen: '4 min ago',
    signIn: 'Email',
  },
  {
    id: 'u4',
    name: 'noodle.boi',
    handle: 'noodle.boi',
    joined: '1 Nov 2026',
    age: '18+',
    plus: false,
    status: 'active',
    reports: 1,
    rooms: 0,
    lastSeen: '1 h ago',
    signIn: 'Google',
  },
  {
    id: 'u5',
    name: 'spam_bot_44',
    handle: 'spam_bot_44',
    joined: '8 Nov 2026',
    age: '18+',
    plus: false,
    status: 'banned',
    statusNote: 'Banned yesterday · spam',
    reports: 4,
    rooms: 0,
    lastSeen: 'yesterday',
    signIn: 'Email',
  },
  {
    id: 'u6',
    name: 'Fern',
    handle: 'fernnn',
    joined: '30 Oct 2026',
    age: '18+',
    plus: true,
    status: 'active',
    reports: 0,
    rooms: 2,
    lastSeen: '20 min ago',
    signIn: 'Google',
  },
  {
    id: 'u7',
    name: 'robux_giver',
    handle: 'robux_giver',
    joined: '7 Nov 2026',
    age: '18+',
    plus: false,
    status: 'suspended',
    statusNote: 'Suspended 7 days · scam room',
    reports: 3,
    rooms: 1,
    lastSeen: '35 min ago',
    signIn: 'Email',
  },
  {
    id: 'u8',
    name: 'Ploy',
    handle: 'ploy.p',
    joined: '2 Nov 2026',
    age: 'under 18',
    plus: false,
    status: 'active',
    reports: 0,
    rooms: 0,
    lastSeen: 'now',
    signIn: 'Google',
  },
];

export interface AdminRoom {
  id: string;
  name: string;
  emoji: string;
  owner: string;
  visibility: 'Private' | 'Ask to join' | 'Open';
  listed: boolean;
  members: number;
  inside: number;
  capacity: number;
  plus: boolean;
  reports: number;
  state: 'ok' | 'delisted' | 'closed';
}

export const ADMIN_ROOMS: AdminRoom[] = [
  {
    id: 'chanom',
    name: 'Chanom Friends',
    emoji: '🍓',
    owner: 'feifei',
    visibility: 'Private',
    listed: false,
    members: 9,
    inside: 6,
    capacity: 100,
    plus: true,
    reports: 0,
    state: 'ok',
  },
  {
    id: 'lofi',
    name: 'Lo-fi Study Hall',
    emoji: '🎧',
    owner: 'Studyhall',
    visibility: 'Open',
    listed: true,
    members: 980,
    inside: 96,
    capacity: 100,
    plus: true,
    reports: 0,
    state: 'ok',
  },
  {
    id: 'anime',
    name: 'Anime Club TH',
    emoji: '🌸',
    owner: 'Fern',
    visibility: 'Open',
    listed: true,
    members: 920,
    inside: 50,
    capacity: 50,
    plus: true,
    reports: 1,
    state: 'ok',
  },
  {
    id: 'robux',
    name: 'FREE ROBUX GIVEAWAY',
    emoji: '💰',
    owner: 'robux_giver',
    visibility: 'Open',
    listed: true,
    members: 41,
    inside: 3,
    capacity: 25,
    plus: false,
    reports: 3,
    state: 'ok',
  },
  {
    id: 'ielts',
    name: 'IELTS Speaking Café',
    emoji: '🗣️',
    owner: 'Teacher Ann',
    visibility: 'Ask to join',
    listed: true,
    members: 410,
    inside: 9,
    capacity: 25,
    plus: false,
    reports: 1,
    state: 'ok',
  },
  {
    id: 'dorm',
    name: 'Dorm 3B',
    emoji: '🛏️',
    owner: 'Nam',
    visibility: 'Private',
    listed: false,
    members: 12,
    inside: 0,
    capacity: 25,
    plus: false,
    reports: 1,
    state: 'ok',
  },
  {
    id: 'old-scam',
    name: 'Crypto Study Group',
    emoji: '🪙',
    owner: 'spam_bot_44',
    visibility: 'Open',
    listed: false,
    members: 7,
    inside: 0,
    capacity: 25,
    plus: false,
    reports: 6,
    state: 'closed',
  },
];

export interface AuditEntry {
  at: string;
  who: string;
  action: string;
  target: string;
  reason?: string;
}

export const AUDIT: AuditEntry[] = [
  { at: 'Today 14:02', who: 'Auto', action: 'Out of Common rooms 1 h', target: '@xx_toxic', reason: '5 reports in 30 min' },
  { at: 'Today 13:54', who: 'Auto', action: 'Hid a picture', target: 'Garage Band · Room chat', reason: 'Picture check: sexual 0.91' },
  { at: 'Today 12:10', who: 'Auto', action: 'Muted 15 min', target: 'Guest Moo', reason: '3 reports in 10 min' },
  { at: 'Today 09:31', who: 'Chanom', action: 'Suspended 7 days', target: '@robux_giver', reason: 'Scam room' },
  { at: 'Yesterday 21:14', who: 'Chanom', action: 'Banned', target: '@spam_bot_44', reason: 'Spam in Common rooms' },
  { at: 'Yesterday 21:14', who: 'Chanom', action: 'Closed room', target: 'Crypto Study Group', reason: 'Scam' },
  { at: 'Yesterday 18:02', who: 'Chanom', action: 'Added to word list', target: '3 Thai words' },
  { at: '6 Nov 20:40', who: 'Chanom', action: 'Warned', target: '@xx_toxic', reason: 'Rude words' },
  { at: '6 Nov 11:12', who: 'Chanom', action: 'Published map', target: 'Cosy Library v3' },
];

export const WORDS = ['(slur 1)', '(slur 2)', '(swear 1)', '(swear 2)', '(Thai swear 1)', '(Thai swear 2)', '(Thai swear 3)', 'robux-free'];
