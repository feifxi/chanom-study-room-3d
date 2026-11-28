import { DEFAULT_ROOM_RULES } from '@connecta/shared';
import type { PrismaClient, RoomRole, Visibility } from '../../src/generated/prisma/client.js';
import { DAY, HOUR, ROOM, ago, id, type Who } from './kit.js';

/**
 * Four rooms, one of each kind: Fei's private one (Plus, so 30 inside), a study group you ask
 * to join, and two open ones on Discover. Each has an owner, a mod and members; Chanom Friends has an
 * invite link and a past ban, CPE Year 3 a request waiting.
 */
const ROOMS: {
  id: string;
  name: string;
  emoji: string;
  description: string;
  mapId: string;
  visibility: Visibility;
  tags: string[];
  language: string;
  rules?: string;
  slowMode?: boolean;
  allowGuests?: boolean;
  age: number;
  members: [Who, RoomRole][];
}[] = [
  {
    id: ROOM.chanom,
    name: 'Chanom Friends',
    emoji: '🍓',
    description: 'Our little corner. Study, chill, play cards on Friday.',
    mapId: 'library',
    visibility: 'private',
    tags: ['Study', 'Chill'],
    language: 'Thai',
    allowGuests: false,
    age: 60,
    members: [
      ['fei', 'owner'],
      ['ter', 'mod'],
      ['ploy', 'member'],
      ['nam', 'member'],
      ['bow', 'member'],
      ['pim', 'member'],
      ['earth', 'member'],
    ],
  },
  {
    id: ROOM.cpe,
    name: 'CPE Year 3',
    emoji: '💻',
    description: 'Computer engineering, year 3. Exam prep, lab help and late-night debugging.',
    mapId: 'library',
    visibility: 'request',
    tags: ['Study', 'Late night'],
    language: 'Thai',
    rules: '1. Help each other, no copying lab code.\n2. Quiet at the study tables during exam weeks.\n3. Be kind to first-timers.',
    age: 45,
    members: [
      ['ter', 'owner'],
      ['view', 'mod'],
      ['fei', 'member'],
      ['nam', 'member'],
      ['earth', 'member'],
    ],
  },
  {
    id: ROOM.games,
    name: 'Game Night Club',
    emoji: '🎲',
    description: 'Cards, chess and Draw & Guess every evening. New players always welcome!',
    mapId: 'cafe',
    visibility: 'open',
    tags: ['Games', 'Chill'],
    language: 'Mixed',
    rules: '1. Good games only: no rage quits.\n2. Teach new players.\n3. No selling or spam.',
    age: 40,
    members: [
      ['ploy', 'owner'],
      ['mook', 'mod'],
      ['fei', 'member'],
      ['bow', 'member'],
      ['view', 'member'],
      ['pim', 'member'],
    ],
  },
  {
    id: ROOM.lofi,
    name: 'Lo-fi Study Hall',
    emoji: '🎧',
    description: 'Quiet focus under the stars. Cameras off, timers on.',
    mapId: 'rooftop',
    visibility: 'open',
    tags: ['Study', 'Music', 'Late night'],
    language: 'English',
    rules: '1. Quiet: talk in Room chat, not out loud.\n2. Share your focus goal if you like.\n3. Be kind.',
    slowMode: true,
    age: 35,
    members: [
      ['view', 'owner'],
      ['earth', 'mod'],
      ['fei', 'member'],
      ['ploy', 'member'],
      ['nam', 'member'],
      ['mook', 'member'],
    ],
  },
];

export async function seedRooms(prisma: PrismaClient) {
  for (const r of ROOMS) {
    const { members, age, ...fields } = r;
    await prisma.room.create({
      data: {
        ...fields,
        rules: fields.rules ?? DEFAULT_ROOM_RULES,
        createdAt: ago(age * DAY),
        members: {
          create: members.map(([who, role], i) => ({
            userId: id[who],
            role,
            joinedAt: ago((age - i * 3) * DAY),
            visitedAt: ago((i + 1) * 5 * HOUR),
            pinned: who === 'fei' && r.id === ROOM.chanom,
            // Fei hears every message from her own room
            notify: who === 'fei' && r.id === ROOM.chanom ? 'all' : 'mentions',
          })),
        },
      },
    });
  }
  await prisma.invite.create({
    data: {
      code: 'seedchnm',
      roomId: ROOM.chanom,
      kind: 'member',
      createdById: id.fei,
      expiry: 'never',
      uses: 4,
      createdAt: ago(50 * DAY),
    },
  });
  await prisma.roomBan.create({
    data: { roomId: ROOM.chanom, userId: id.view, byId: id.fei, reason: 'Kept posting links in chat', createdAt: ago(30 * DAY) },
  });
  await prisma.joinRequest.create({
    data: { roomId: ROOM.cpe, userId: id.pim, note: 'Hi! I’m in CPE too, section 2 🙏', createdAt: ago(3 * HOUR) },
  });
  console.log(`Rooms: ${ROOMS.length} (Chanom Friends private, CPE Year 3 ask to join, two open on Discover)`);
}
