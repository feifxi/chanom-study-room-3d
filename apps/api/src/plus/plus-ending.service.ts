import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { GRACE_DAYS, maxInside, PLUS_PLANS, REMIND_DAYS, type PlanId } from '@connecta/shared';
import type { Env } from '../config/env.js';
import { MailService } from '../mail/mail.service.js';
import { plusMail } from '../mail/plus-mail.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { PlusService } from './plus.service.js';

const DAY_MS = 86_400_000;
/** A card that renews is charged at the date; Stripe's notice can take a little while */
const CARD_WAIT_MS = 60 * 60_000;

/** The steps, in order: each happens once per plus_until */
const STEPS = ['soon', 'ended', 'graceSoon', 'over'] as const;
type Step = (typeof STEPS)[number];

const day = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Bangkok' });

/**
 * When Plus ends (docs/features/15-plus.md, "When Plus ends"). Every few minutes, for everyone whose Plus is near its date
 * or recently past it:
 * - **soon** (3 days before), unless a card renews it: PromptPay gets a "pay to renew" reminder; a
 *   cancelled plan or a gift gets "Plus ends on …".
 * - **ended:** the ✨ name and personal limits go (rooms and tabs are told), and "your rooms keep their
 *   space for 7 more days" (or just "Plus ended").
 * - **graceSoon** (a day before the grace ends), room owners only: "tomorrow your rooms go back to 15".
 * - **over:** their rooms go back to Free: a people limit set above 15 comes down. Nobody inside
 *   is sent out; new people wait at the door until there's space.
 * Each step is a 🔔 notice and an email. A missed step is skipped if a later one is due (a late
 * server sends only the newest news).
 */
@Injectable()
export class PlusEndingService {
  private readonly log = new Logger(PlusEndingService.name);
  private readonly web: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly plus: PlusService,
    private readonly inbox: NotificationsService,
    private readonly mail: MailService,
    config: ConfigService<Env, true>,
  ) {
    this.web = config.get('WEB_ORIGIN', { infer: true });
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async tick() {
    await this.sweep().catch((error: unknown) => this.log.error(`Plus sweep: ${String(error)}`));
  }

  /** Runs every due step; returns how many people had one */
  async sweep(now = new Date()): Promise<number> {
    const people = await this.prisma.user.findMany({
      where: {
        plusUntil: { lte: new Date(now.getTime() + REMIND_DAYS * DAY_MS), gte: new Date(now.getTime() - 60 * DAY_MS) },
        // (SQL's NOT on a null is never true, so null is asked for by itself)
        OR: [{ plusNotice: null }, { NOT: { plusNotice: { startsWith: 'over@' } } }],
      },
      include: { plusSubscription: true },
    });
    let done = 0;
    for (const person of people) {
      try {
        if (await this.step(person, now)) done++;
      } catch (error) {
        this.log.warn(`Plus ending for ${person.id}: ${String(error)}`);
      }
    }
    return done;
  }

  private async step(
    person: {
      id: string;
      email: string;
      plusUntil: Date | null;
      plusNotice: string | null;
      plusSubscription: { plan: string; method: string; renews: boolean } | null;
    },
    now: Date,
  ): Promise<boolean> {
    const until = person.plusUntil;
    if (!until) return false;
    const sub = person.plusSubscription;
    const cardRenews = !!sub?.renews && sub.method === 'card';
    const t = now.getTime();
    const end = until.getTime();
    const due: Step | null =
      t >= end + GRACE_DAYS * DAY_MS
        ? 'over'
        : t >= end + (GRACE_DAYS - 1) * DAY_MS
          ? 'graceSoon'
          : t >= end + (cardRenews ? CARD_WAIT_MS : 0)
            ? 'ended'
            : t >= end - REMIND_DAYS * DAY_MS && t < end && !cardRenews
              ? 'soon'
              : null;
    if (!due) return false;
    const [doneStep, doneFor] = (person.plusNotice ?? '').split('@');
    const before = doneFor === until.toISOString() ? STEPS.indexOf(doneStep as Step) : -1;
    const now_ = STEPS.indexOf(due);
    if (now_ <= before) return false;
    // Claim the step first, so two API processes never send it twice
    const claimed = await this.prisma.user.updateMany({
      where: { id: person.id, plusUntil: until, plusNotice: person.plusNotice },
      data: { plusNotice: `${due}@${until.toISOString()}` },
    });
    if (!claimed.count) return false;

    // Plus went: the ✨ name and limits (once, even if a later step is the one due)
    if (now_ >= 1 && before < 1) {
      if (sub?.renews) await this.prisma.plusSubscription.update({ where: { userId: person.id }, data: { renews: false } });
      await this.plus.announce(person.id, true, now);
    }
    const rooms = await this.prisma.room.findMany({
      where: { members: { some: { userId: person.id, role: 'owner' } } },
      select: { id: true, name: true, capacity: true },
    });
    if (due === 'over') {
      for (const room of rooms) {
        const max = maxInside(false);
        if (room.capacity !== null && room.capacity > max)
          await this.prisma.room.update({ where: { id: room.id }, data: { capacity: max } });
      }
      if (rooms.length) this.plus.roomsChanged(person.id);
      return true;
    }
    const news = this.news(due, { until, sub, rooms, now });
    if (!news) return true;
    await this.inbox.plus(person.id, news.line, news.href);
    await this.mail
      .deliver(plusMail(person.email, { subject: news.subject, line: news.line, button: news.button, link: `${this.web}${news.href}` }))
      .catch((error: unknown) => this.log.warn(`Plus email: ${String(error)}`));
    return true;
  }

  private news(
    step: Exclude<Step, 'over'>,
    {
      until,
      sub,
      rooms,
      now,
    }: { until: Date; sub: { plan: string; method: string; renews: boolean } | null; rooms: { name: string }[]; now: Date },
  ): { subject: string; line: string; button: string; href: string } | null {
    const date = day(until);
    const left = Math.max(1, Math.ceil((until.getTime() + GRACE_DAYS * DAY_MS - now.getTime()) / DAY_MS));
    const days = `${left} more day${left > 1 ? 's' : ''}`;
    const roomsLine =
      rooms.length === 1
        ? `${rooms[0]!.name} keeps its space for ${days}, then goes back to Free`
        : rooms.length
          ? `Your ${rooms.length} rooms keep their space for ${days}, then go back to Free`
          : null;
    switch (step) {
      case 'soon': {
        if (sub?.renews && sub.method === 'promptpay') {
          const plan = PLUS_PLANS[sub.plan as PlanId] ?? PLUS_PLANS.monthly;
          return {
            subject: `Your Plus renews on ${date}`,
            line: `Your Plus renews on ${date}. Pay ฿${plan.price} with PromptPay to keep it ✨`,
            button: 'Pay with PromptPay',
            href: `/checkout?plan=${sub.plan}&method=promptpay`,
          };
        }
        return {
          subject: `Your Plus ends on ${date}`,
          line: `Your Plus ends on ${date}. Keep it going any time from the Plus page.`,
          button: 'Keep Plus',
          href: '/home/plus',
        };
      }
      case 'ended':
        return {
          subject: 'Your Plus has ended',
          line: roomsLine ? `Your Plus has ended. ${roomsLine}. Nothing is deleted.` : 'Your Plus has ended. Get it again any time.',
          button: 'Get Plus again',
          href: '/home/plus',
        };
      case 'graceSoon': {
        if (!rooms.length) return null;
        return {
          subject: 'Tomorrow your rooms go back to Free',
          line: `Tomorrow your rooms go back to ${maxInside(false)} people at once. Nobody is sent out, and nothing is deleted.`,
          button: 'Keep Plus',
          href: '/home/plus',
        };
      }
    }
  }
}
