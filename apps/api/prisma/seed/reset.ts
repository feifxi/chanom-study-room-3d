import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { MARK, SEED_ROOMS, SEED_USERS } from './kit.js';

/**
 * Clears what the last run made, so running again replaces it: the seed rooms and any room a seed
 * person owns (members, chat, invites and decks go with them), what passes between seed people, and
 * the seed people's own history. Your own accounts and rooms aren't touched, but a seed person's
 * things are reset, including what you did while signed in as one.
 */
export async function resetSeed(prisma: PrismaClient) {
  const users = { in: SEED_USERS };
  const marked = { endsWith: MARK };
  const both = (a: string, b: string) => ({ [a]: users, [b]: users });
  await prisma.$transaction([
    prisma.focusSession.deleteMany({ where: { userId: users } }),
    prisma.room.deleteMany({ where: { id: { in: SEED_ROOMS } } }),
    // Rooms a seed person made while you tried things as them
    prisma.room.deleteMany({ where: { members: { some: { role: 'owner', userId: users } } } }),
    // DMs between two seed people ("a:b", both ids)
    prisma.dm.deleteMany({ where: { members: { every: { userId: users } } } }),
    prisma.friendship.deleteMany({ where: both('userId', 'friendId') }),
    prisma.friendRequest.deleteMany({ where: both('fromId', 'toId') }),
    prisma.block.deleteMany({ where: both('userId', 'blockedId') }),
    prisma.notification.deleteMany({ where: { userId: users } }),
    prisma.todo.deleteMany({ where: { userId: users } }),
    prisma.questProgress.deleteMany({ where: { userId: users } }),
    prisma.coinEntry.deleteMany({ where: { userId: users } }),
    prisma.ownedItem.deleteMany({ where: { userId: users } }),
    prisma.plusSubscription.deleteMany({ where: { userId: users } }),
    prisma.checkout.deleteMany({ where: { userId: users } }),
    prisma.payment.deleteMany({ where: { ref: { startsWith: 'local:seed-' } } }),
    prisma.accountAction.deleteMany({ where: { userId: users } }),
    prisma.report.deleteMany({ where: { id: marked } }),
    prisma.auditEntry.deleteMany({ where: { id: marked } }),
  ]);
}
