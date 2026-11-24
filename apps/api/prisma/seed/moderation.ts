import type { PrismaClient } from '../../src/generated/prisma/client.js';
import type { Prisma } from '../../src/generated/prisma/client.js';
import { messageWith } from './chat.js';
import { DAY, HOUR, MINUTE, ROOM, ago, id, seedUuid } from './kit.js';

type Report = Omit<Prisma.ReportUncheckedCreateInput, 'id'>;

/**
 * Something for the admin site's Reports queue: three open cases (one urgent: three accounts about
 * the same person in a Common room) and two decided ones, with the team's actions in the audit log.
 * Pim has a warning already, so their new case shows the history.
 */
export async function seedModeration(prisma: PrismaClient) {
  const people = await prisma.user.findMany({ where: { id: { in: Object.values(id) } } });
  const user = (uid: string) => people.find((p) => p.id === uid)!;
  const who = (uid: string) => ({ id: uid, name: user(uid).name, handle: user(uid).handle, guest: false });
  const line = (m: { id: string; text: string; createdAt: Date; authorId: string }) => ({
    id: m.id,
    by: user(m.authorId).name,
    byId: m.authorId,
    text: m.text,
    at: m.createdAt.toISOString(),
  });
  const around = async (roomId: string, m: { id: string }) => {
    const [before, after] = await Promise.all([
      prisma.message.findMany({ where: { roomId, id: { lt: m.id } }, orderBy: { id: 'desc' }, take: 2 }),
      prisma.message.findMany({ where: { roomId, id: { gt: m.id } }, orderBy: { id: 'asc' }, take: 2 }),
    ]);
    return [...before.reverse(), ...after].map(line);
  };
  const reports: (Report & { createdAt: Date })[] = [];

  // 1. Open, urgent: three accounts about View in a Common room in the last hour
  for (const [reporter, minutes, details] of [
    [id.ploy, 50, 'Kept telling people at my table to leave'],
    [id.nam, 35, ''],
    [id.mook, 20, 'Mean to a new player in bubbles'],
  ] as const) {
    reports.push({
      kind: 'person',
      userId: id.view,
      place: 'common-cafe-1',
      reason: 'harass',
      details,
      reporterId: reporter,
      counted: true,
      context: {
        reported: who(id.view),
        recent: [],
        bubblesSeen: ['you’re all so slow lol', 'nobody wants you at this table'],
        placeName: 'Cat Café Common Room #1',
      },
      createdAt: ago(minutes * MINUTE),
    });
  }

  // 2. Open: Pim's selling message in Game Night Club
  const spam = await messageWith(prisma, ROOM.games, 'dm me for cheap game keys 💸 only 99 baht');
  const spamContext = { reported: who(id.pim), message: line(spam), around: await around(ROOM.games, spam), placeName: 'Game Night Club' };
  for (const [reporter, after] of [
    [id.mook, 6],
    [id.ploy, 30],
  ] as const) {
    reports.push({
      kind: 'message',
      userId: id.pim,
      messageId: spam.id,
      place: ROOM.games,
      reason: 'spam',
      reporterId: reporter,
      counted: true,
      context: spamContext,
      createdAt: new Date(spam.createdAt.getTime() + after * MINUTE),
    });
  }

  // 3. Open: a room on Discover, by a member who found it too loud
  const lofi = await prisma.room.findUniqueOrThrow({ where: { id: ROOM.lofi } });
  reports.push({
    kind: 'room',
    place: ROOM.lofi,
    reason: 'room_inside',
    details: 'People keep talking out loud even though the rules say quiet',
    reporterId: id.bow,
    context: { room: { name: lofi.name, description: lofi.description, rules: lofi.rules, ownerId: id.view } },
    createdAt: ago(6 * HOUR),
  });

  // 4. Decided a week ago: Pim warned for spam in Chanom Friends
  const warnedAt = ago(7 * DAY);
  reports.push({
    kind: 'person',
    userId: id.pim,
    place: ROOM.chanom,
    reason: 'spam',
    details: 'Sent everyone the same link to a shop',
    reporterId: id.nam,
    counted: true,
    context: { reported: who(id.pim), recent: [], bubblesSeen: [], placeName: 'Chanom Friends' },
    status: 'done',
    outcome: 'Warned',
    decidedById: id.fei,
    decidedAt: warnedAt,
    createdAt: ago(8 * DAY),
  });

  // 5. Decided yesterday: dismissed, a joke taken the wrong way
  const lol = await messageWith(prisma, ROOM.games, 'lol');
  const dismissedAt = ago(DAY);
  reports.push({
    kind: 'message',
    userId: id.view,
    messageId: lol.id,
    place: ROOM.games,
    reason: 'harass',
    reporterId: id.bow,
    counted: true,
    context: { reported: who(id.view), message: line(lol), around: await around(ROOM.games, lol), placeName: 'Game Night Club' },
    status: 'done',
    outcome: 'Dismissed',
    decidedById: id.fei,
    decidedAt: dismissedAt,
    createdAt: ago(2 * DAY - 10 * MINUTE),
  });

  await prisma.report.createMany({ data: reports.map((r) => ({ ...r, id: seedUuid(r.createdAt) })) });
  await prisma.accountAction.create({
    data: { userId: id.pim, kind: 'warn', reason: 'Spam or scams', byId: id.fei, createdAt: warnedAt },
  });
  const audit = (at: Date, action: string, targetKind: string, targetId: string, reason: string, details?: object) => ({
    id: seedUuid(at),
    byId: id.fei,
    action,
    targetKind,
    targetId,
    reason,
    details,
    createdAt: at,
  });
  await prisma.auditEntry.createMany({
    data: [
      audit(warnedAt, 'account.warn', 'user', id.pim, 'Spam or scams'),
      audit(new Date(warnedAt.getTime() + 1000), 'report.warn', 'report', `person:${id.pim}`, 'Spam or scams', { reports: 1 }),
      audit(dismissedAt, 'report.dismiss', 'report', `message:${lol.id}`, 'A joke between friends, not harassment', { reports: 1 }),
    ],
  });
  console.log('Reports: 3 open cases (1 urgent) and 2 decided, a warning on Pim, the team’s actions in the audit log');
}
