import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { DAY, HOUR, MINUTE, NOW, ago, id, seedUuid } from './kit.js';

const addMonths = (d: Date, n: number) => {
  const x = new Date(d);
  x.setUTCMonth(x.getUTCMonth() + n);
  return x;
};

/**
 * Plus as the local stand-in would have left it: Fei pays monthly by card (three renewals, one charged
 * twice and refunded by the team), and gifted Earth a month, which shows as a card in their DM.
 */
export async function seedPlus(prisma: PrismaClient) {
  const started = ago(62 * DAY);
  const renewals = [started, addMonths(started, 1), addMonths(started, 2)].filter((d) => d.getTime() < NOW);
  const last = renewals[renewals.length - 1]!;
  await prisma.checkout.create({
    data: { userId: id.fei, plan: 'monthly', method: 'card', status: 'paid', createdAt: started, paidAt: started },
  });
  await prisma.plusSubscription.create({ data: { userId: id.fei, plan: 'monthly', method: 'card', renews: true, createdAt: started } });
  await prisma.payment.createMany({
    data: renewals.map((at, i) => ({
      userId: id.fei,
      what: 'Plus · Monthly',
      amount: 89,
      method: 'card',
      ref: `local:seed-fei-${i}`,
      createdAt: at,
    })),
  });
  // The renewal charged twice: the second one given back from the admin site
  // (never later than now: months differ in length, so the last renewal may be only hours ago)
  const refundedAt = new Date(Math.min(last.getTime() + 20 * HOUR, NOW - 30 * MINUTE));
  await prisma.payment.create({
    data: {
      userId: id.fei,
      what: 'Plus · Monthly',
      amount: 89,
      method: 'card',
      ref: 'local:seed-fei-twice',
      createdAt: new Date(last.getTime() + 2 * MINUTE),
      refundedAt,
      refundReason: 'Charged twice',
      refundedById: id.fei,
    },
  });
  await prisma.auditEntry.create({
    data: {
      id: seedUuid(refundedAt),
      byId: id.fei,
      action: 'payment.refund',
      targetKind: 'user',
      targetId: id.fei,
      reason: 'Charged twice',
      details: { what: 'Plus · Monthly', amount: 89 },
      createdAt: refundedAt,
    },
  });
  await prisma.user.update({ where: { id: id.fei }, data: { plusUntil: addMonths(last, 1) } });

  // Gift Plus: Fei → Earth, a month by PromptPay
  const giftAt = ago(5 * DAY);
  const note = 'For all the algorithms help 💜';
  await prisma.checkout.create({
    data: {
      userId: id.fei,
      plan: 'gift',
      method: 'promptpay',
      status: 'paid',
      createdAt: giftAt,
      paidAt: giftAt,
      giftToId: id.earth,
      giftMonths: 1,
      giftNote: note,
    },
  });
  await prisma.payment.create({
    data: {
      userId: id.fei,
      what: 'Gift for Earth · 1 month',
      amount: 89,
      method: 'promptpay',
      ref: 'local:seed-gift-earth',
      createdAt: giftAt,
    },
  });
  await prisma.user.update({ where: { id: id.earth }, data: { plusUntil: addMonths(giftAt, 1) } });
  const card = { roomId: null, state: null, invite: null, room: null, gift: { months: 1, note } };
  const thanks = new Date(giftAt.getTime() + 25 * MINUTE);
  const dm = await prisma.dm.create({
    data: {
      pair: [id.fei, id.earth].sort().join(':'),
      createdAt: giftAt,
      members: { create: [{ userId: id.fei }, { userId: id.earth }] },
      messages: {
        create: [
          { id: seedUuid(giftAt), authorId: id.fei, text: '', kind: 'gift', card, createdAt: giftAt },
          { id: seedUuid(thanks), authorId: id.earth, text: 'FEI 😭 thank you so much!!', createdAt: thanks },
        ],
      },
    },
    include: { messages: { orderBy: { id: 'asc' } } },
  });
  const lastId = dm.messages[dm.messages.length - 1]!.id;
  await prisma.dm.update({ where: { id: dm.id }, data: { lastId } });
  await prisma.dmMember.updateMany({ where: { dmId: dm.id }, data: { lastReadId: lastId } });
  console.log(`Plus: Fei monthly by card (${renewals.length + 1} payments, 1 refunded), her gift of a month to Earth`);
}
