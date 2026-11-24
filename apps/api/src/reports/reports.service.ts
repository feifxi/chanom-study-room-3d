import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { PERSON_REASONS, REPORT_STEPS, ROOM_REASONS, parseCommonCopy } from '@connecta/shared';
import type { Prisma, Message, User } from '../generated/prisma/client.js';
import { SettingsService } from '../settings/settings.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { Env } from '../config/env.js';
import { CommonService } from '../common/common.service.js';
import { FriendsService } from '../friends/friends.service.js';
import { GameService } from '../game/game.service.js';
import { PresenceService } from '../presence/presence.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ReportBody, ReportSent } from './reports.schemas.js';

const MINUTE = 60_000;
/** Reports one person may send in an hour: plenty for a bad night, not enough to flood the team */
export const REPORTS_PER_HOUR = 10;
const PERSON = new Set<string>(PERSON_REASONS.map((r) => r.id));
const ROOM = new Set<string>(ROOM_REASONS.map((r) => r.id));

/**
 * Reports (feature 14). Every report is kept for the Connecta team, with what they need to judge
 * it; a room's owner and mods never see them. Reports about someone in a room or a Common copy, from
 * accounts that are there, count toward the automatic steps:
 * - a room: 3 in 10 minutes → muted there for 15 (the same as a mod's timeout)
 * - Common rooms: 5 in 30 minutes → out of every Common room for an hour
 */
@Injectable()
export class ReportsService implements OnModuleDestroy {
  private readonly log = new Logger(ReportsService.name);
  private readonly redis: Redis;

  constructor(
    config: ConfigService<Env, true>,
    private readonly prisma: PrismaService,
    private readonly presence: PresenceService,
    private readonly game: GameService,
    private readonly friends: FriendsService,
    private readonly common: CommonService,
    private readonly audit: AuditService,
    private readonly settings: SettingsService,
  ) {
    this.redis = new Redis(config.get('REDIS_URL', { infer: true }), { maxRetriesPerRequest: 2 });
    this.redis.on('error', (error) => this.log.warn(`Redis: ${error.message}`));
  }

  async onModuleDestroy() {
    await this.redis.quit().catch(() => {});
  }

  async report(reporterId: string, input: ReportBody, now = Date.now()): Promise<ReportSent> {
    const reporter = await this.prisma.user.findUnique({ where: { id: reporterId } });
    if (!reporter) throw new NotFoundException();
    if (!reporter.isAnonymous && !reporter.handle) throw new ForbiddenException('Finish signing up first');
    if ((input.kind === 'room') !== ROOM.has(input.reason) || (input.kind !== 'room' && !PERSON.has(input.reason)))
      throw new BadRequestException('That reason is for another kind of report');

    const lately = await this.prisma.report.count({ where: { reporterId, createdAt: { gt: new Date(now - 60 * MINUTE) } } });
    if (lately >= REPORTS_PER_HOUR) {
      throw new HttpException(
        { code: 'too_many', message: 'Thanks, the team has your reports. You can send more in a little while.' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const about = await this.about(reporterId, input);
    if (about.userId === reporterId) throw new BadRequestException('You can’t report yourself');
    const report = await this.prisma.report.create({
      data: {
        kind: input.kind,
        userId: about.userId,
        messageId: about.messageId,
        place: about.place,
        dmId: about.dmId,
        reason: input.reason,
        details: input.details ?? '',
        reporterId,
        context: about.context as Prisma.InputJsonValue,
      },
    });
    if (about.userId && about.place && !reporter.isAnonymous) await this.count(report.id, reporterId, about.userId, about.place, now);
    if (input.block && about.userId && !reporter.isAnonymous && about.target && !about.target.isAnonymous) {
      await this.friends.block(reporterId, about.userId).catch(() => {});
    }
    return { id: report.id };
  }

  /** Who and where the report is about, checked against what the reporter can see, and its context */
  private async about(reporterId: string, input: ReportBody) {
    if (input.kind === 'message') {
      if (!input.messageId) throw new BadRequestException('Which message?');
      const m = await this.prisma.message.findUnique({ where: { id: input.messageId }, include: { author: true } });
      if (!m || !(await this.canSee(reporterId, m))) throw new NotFoundException('That message is gone');
      return {
        target: m.author,
        userId: m.authorId,
        messageId: m.id,
        place: m.roomId,
        dmId: m.dmId,
        context: { reported: who(m.author), message: line(m, m.author), around: await this.around(m), ...(await this.placeName(m.roomId)) },
      };
    }
    if (input.kind === 'room') {
      const room = input.place ? await this.prisma.room.findUnique({ where: { id: input.place } }) : null;
      if (!room) throw new NotFoundException('That room is gone');
      if (await this.isOwner(reporterId, room.id)) throw new BadRequestException('You can’t report your own room');
      const owner = await this.prisma.membership.findFirst({ where: { roomId: room.id, role: 'owner' }, select: { userId: true } });
      return {
        target: null,
        userId: null,
        messageId: null,
        place: room.id,
        dmId: null,
        context: { room: { name: room.name, description: room.description, rules: room.rules, ownerId: owner?.userId ?? null } },
      };
    }
    if (!input.userId) throw new BadRequestException('Who?');
    const target = await this.prisma.user.findUnique({ where: { id: input.userId } });
    if (!target) throw new NotFoundException();
    const place = input.place ?? null;
    // What they wrote lately where it happened: the room's chat, or your DM with them
    const pair = [reporterId, target.id].sort().join(':');
    const dm = place ? null : await this.prisma.dm.findUnique({ where: { pair } });
    const recent =
      place && !parseCommonCopy(place)
        ? await this.prisma.message.findMany({
            where: { roomId: place, authorId: target.id, deletedAt: null },
            orderBy: { id: 'desc' },
            take: 5,
          })
        : dm
          ? await this.prisma.message.findMany({
              where: { dmId: dm.id, authorId: target.id, deletedAt: null },
              orderBy: { id: 'desc' },
              take: 5,
            })
          : [];
    return {
      target,
      userId: target.id,
      messageId: null,
      place,
      dmId: dm?.id ?? null,
      context: {
        reported: who(target),
        recent: recent.reverse().map((m) => line(m, target)),
        // Bubbles aren't stored anywhere: these are what the reporter's screen showed
        bubblesSeen: input.bubbles ?? [],
        ...(await this.placeName(place)),
      },
    };
  }

  /** Counts toward the automatic step, and takes it when enough different accounts reported */
  private async count(reportId: string, reporterId: string, userId: string, place: string, now: number) {
    // Switched off on the admin site: reports still reach the team, nothing happens by itself
    if (!this.settings.get().reportSteps) return;
    const common = parseCommonCopy(place);
    // Only reports from someone who's there count
    if (common ? (await this.presence.roomOf(reporterId, now)) !== place : !(await this.inRoom(reporterId, place, new Date(now)))) return;
    const rule = common ? REPORT_STEPS.common : REPORT_STEPS.room;
    const key = common ? `reports:common:${userId}` : `reports:room:${place}:${userId}`;
    const window = rule.windowMinutes * MINUTE;
    await this.redis.zremrangebyscore(key, 0, now - window);
    // One account counts once in a window, however often it reports
    await this.redis.zadd(key, now, reporterId);
    await this.redis.pexpire(key, window);
    await this.prisma.report.update({ where: { id: reportId }, data: { counted: true } });
    if ((await this.redis.zcard(key)) < rule.reports) return;
    await this.redis.del(key);
    // The team's own accounts go to the team, never to an automatic step
    if ((await this.prisma.user.findUnique({ where: { id: userId }, select: { team: true } }))?.team) return;
    const until = now + rule.minutes * MINUTE;
    if (common) {
      await this.common.putOut(userId, { until, by: 'reports' }, now);
      const at = await this.presence.roomOf(userId, now);
      if (at && parseCommonCopy(at)) this.game.roomEvent({ roomId: at, type: 'ban', userId });
    } else {
      // The owner runs the room: reports about them go to the team only
      if (await this.isOwner(userId, place)) return;
      await this.prisma.membership.updateMany({
        where: { roomId: place, userId, OR: [{ timedOutUntil: null }, { timedOutUntil: { lt: new Date(until) } }] },
        data: { timedOutUntil: new Date(until) },
      });
      // Guests have no membership: inside 3D is where they'd talk
      this.game.roomEvent({ roomId: place, type: 'timeout', userId, until });
    }
    await this.prisma.report.update({ where: { id: reportId }, data: { step: common ? 'common_out' : 'muted' } });
    await this.audit.record({
      by: null,
      action: common ? 'report.common_out' : 'report.muted',
      targetKind: 'user',
      targetId: userId,
      details: { place, minutes: rule.minutes, reportId },
    });
  }

  private async isOwner(userId: string, roomId: string) {
    const m = await this.prisma.membership.findUnique({ where: { roomId_userId: { roomId, userId } }, select: { role: true } });
    return m?.role === 'owner';
  }

  private async inRoom(userId: string, roomId: string, now: Date) {
    const [member, guest] = await Promise.all([
      this.prisma.membership.findUnique({ where: { roomId_userId: { roomId, userId } } }),
      this.prisma.guestVisit.findUnique({ where: { roomId_userId: { roomId, userId } } }),
    ]);
    return !!member || (!!guest && guest.until > now);
  }

  private async canSee(userId: string, m: Message) {
    if (m.roomId) return !!(await this.prisma.membership.findUnique({ where: { roomId_userId: { roomId: m.roomId, userId } } }));
    if (m.dmId) return !!(await this.prisma.dmMember.findUnique({ where: { dmId_userId: { dmId: m.dmId, userId } } }));
    return false;
  }

  /** A few messages either side, so the team sees what it answered */
  private async around(m: Message) {
    const where = m.roomId ? { roomId: m.roomId } : { dmId: m.dmId };
    const [before, after] = await Promise.all([
      this.prisma.message.findMany({
        where: { ...where, id: { lt: m.id }, deletedAt: null },
        orderBy: { id: 'desc' },
        take: 3,
        include: { author: true },
      }),
      this.prisma.message.findMany({
        where: { ...where, id: { gt: m.id }, deletedAt: null },
        orderBy: { id: 'asc' },
        take: 2,
        include: { author: true },
      }),
    ]);
    return [...before.reverse(), ...after].map((x) => line(x, x.author));
  }

  private async placeName(place: string | null) {
    if (!place) return {};
    const common = parseCommonCopy(place);
    if (common) return { placeName: `${common.type.name} Common Room #${common.n}` };
    const room = await this.prisma.room.findUnique({ where: { id: place }, select: { name: true } });
    return { placeName: room?.name ?? null };
  }
}

/** Names as they were when reported: they can change later */
const who = (u: User) => ({ id: u.id, name: u.name, handle: u.handle, guest: u.isAnonymous });
const line = (m: Message, author: User) => ({ id: m.id, by: author.name, byId: author.id, text: m.text, at: m.createdAt.toISOString() });
