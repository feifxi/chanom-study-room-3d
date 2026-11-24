import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { DAY, HOUR, MINUTE, ROOM, ago, id, seedUuid } from './kit.js';

/** The 🔔 inbox as the app would have filled it: Fei's has a little of everything, mostly unread */
export async function seedInbox(prisma: PrismaClient) {
  const people = await prisma.user.findMany({ where: { id: { in: Object.values(id) } } });
  const person = (uid: string) => {
    const u = people.find((p) => p.id === uid)!;
    return { id: u.id, name: u.name, handle: u.handle, look: u.look };
  };
  const items: {
    userId: string;
    kind: string;
    text: string;
    href: string;
    person: string | null;
    at: Date;
    read?: boolean;
    groupKey?: string;
    count?: number;
  }[] = [
    // Fei
    {
      userId: id.fei,
      kind: 'friend_request',
      text: '**Bow** sent you a friend request',
      href: '/home/friends',
      person: id.bow,
      at: ago(5 * HOUR),
      groupKey: `friend:${id.bow}`,
    },
    {
      userId: id.fei,
      kind: 'mention',
      text: '**Ploy** mentioned you in Game Night Club: “@fei you’re first on the board, good luck 😈”',
      href: `/r/${ROOM.games}`,
      person: id.ploy,
      at: ago(4 * HOUR),
    },
    {
      userId: id.fei,
      kind: 'mention',
      text: '**Earth** mentioned you in Chanom Friends: “@fei did you get the summary up?”',
      href: `/r/${ROOM.chanom}`,
      person: id.earth,
      at: ago(2 * HOUR),
    },
    {
      userId: id.fei,
      kind: 'messages',
      text: '**3 new messages** in Chanom Friends',
      href: `/r/${ROOM.chanom}`,
      person: null,
      at: ago(12 * MINUTE),
      groupKey: `messages:${ROOM.chanom}`,
      count: 3,
    },
    {
      userId: id.fei,
      kind: 'friend_accepted',
      text: '**Earth** accepted your friend request',
      href: '/home/friends',
      person: id.earth,
      at: ago(20 * DAY),
      read: true,
    },
    // Earth: the gift
    {
      userId: id.earth,
      kind: 'gift',
      text: '**Fei** gifted you 1 month of Plus ✨',
      href: '/home/messages/fei',
      person: id.fei,
      at: ago(5 * DAY),
    },
    // CPE Year 3's owner and mod: Pim is waiting
    ...[id.ter, id.view].map((userId) => ({
      userId,
      kind: 'join_request',
      text: '**Pim** wants to join CPE Year 3',
      href: `/r/${ROOM.cpe}`,
      person: id.pim,
      at: ago(3 * HOUR),
      groupKey: `join:${ROOM.cpe}`,
    })),
    {
      userId: id.bow,
      kind: 'mention',
      text: '**Ter** mentioned you in Chanom Friends: “@bowbow which part? I can help after 9”',
      href: `/r/${ROOM.chanom}`,
      person: id.ter,
      at: ago(8 * HOUR),
      read: true,
    },
    {
      userId: id.pim,
      kind: 'mention',
      text: '**Mook** mentioned you in Game Night Club: “@pimmy no selling here please, see the rules”',
      href: `/r/${ROOM.games}`,
      person: id.mook,
      at: ago(2 * DAY - 5 * MINUTE),
    },
  ];
  await prisma.notification.createMany({
    data: items.map((n) => ({
      id: seedUuid(n.at),
      userId: n.userId,
      kind: n.kind,
      payload: { text: n.text, href: n.href, person: n.person ? person(n.person) : null, count: n.count ?? 1 },
      groupKey: n.groupKey ?? null,
      createdAt: n.at,
      readAt: n.read ? n.at : null,
    })),
  });
  console.log(`Inbox: ${items.length} items (Fei: a request, two mentions, new messages)`);
}
