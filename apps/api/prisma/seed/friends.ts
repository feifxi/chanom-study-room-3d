import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { DAY, HOUR, ago, id, type Who } from './kit.js';

/**
 * Friends: Fei is friends with everyone but Bow, Pim and View (so suggestions and
 * requests have someone to show), and Bow's request to Fei is waiting.
 */
const PAIRS: [Who, Who][] = [
  ['fei', 'ter'],
  ['fei', 'ploy'],
  ['fei', 'nam'],
  ['fei', 'mook'],
  ['fei', 'earth'],
  ['ter', 'view'],
  ['ter', 'nam'],
  ['ter', 'earth'],
  ['ploy', 'nam'],
  ['ploy', 'bow'],
  ['ploy', 'mook'],
  ['ploy', 'pim'],
  ['nam', 'earth'],
  ['view', 'earth'],
  ['pim', 'mook'],
  ['bow', 'mook'],
];

export async function seedFriends(prisma: PrismaClient) {
  await prisma.friendship.createMany({
    data: PAIRS.flatMap(([a, b], i) => {
      const since = ago((50 - i * 2) * DAY);
      return [
        { userId: id[a], friendId: id[b], since },
        { userId: id[b], friendId: id[a], since },
      ];
    }),
  });
  await prisma.friendRequest.create({
    data: { fromId: id.bow, toId: id.fei, createdAt: ago(5 * HOUR), expiresAt: new Date(ago(5 * HOUR).getTime() + 30 * DAY) },
  });
  console.log(`Friends: ${PAIRS.length} pairs, and Bow's request to Fei waiting`);
}
