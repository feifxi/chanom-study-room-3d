import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, User } from '../generated/prisma/client.js';
import { AuditService } from '../audit/audit.service.js';
import { GUEST_EMAIL_DOMAIN } from '../auth/auth.js';
import { GameService } from '../game/game.service.js';
import { LiveService } from '../live/live.service.js';
import { accountMail, type AccountActionKind } from '../mail/account-mail.js';
import { MailService } from '../mail/mail.service.js';
import { hasPlus } from '../plus/plus.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AccountActionInput, AdminAccount, AdminAccountDetail, AdminAccountList, ACCOUNT_FILTERS } from './admin.schemas.js';
import { requireTeam } from './team.js';

const DAY = 86_400_000;
/** A warning shows on the account this long */
const WARNED_DAYS = 30;
const PAGE = 50;

/**
 * Accounts in the admin site (docs/features/16-admin.md): the list, one account, and the team's actions on it.
 * Every action is recorded (account_actions and the audit log) and emailed with its reason; a
 * suspension or ban signs them out everywhere at once and Better Auth refuses new sign-ins.
 */
@Injectable()
export class AccountsAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly mail: MailService,
    private readonly live: LiveService,
    private readonly game: GameService,
  ) {}

  async list(teamId: string, q: { q?: string; filter?: (typeof ACCOUNT_FILTERS)[number] }, now = new Date()): Promise<AdminAccountList> {
    await requireTeam(this.prisma, teamId);
    const text = q.q?.trim().replace(/^@/, '');
    const and: Prisma.UserWhereInput[] = [{ isAnonymous: false }];
    if (text) and.push({ OR: [{ name: { contains: text, mode: 'insensitive' } }, { handle: { contains: text.toLowerCase() } }] });
    if (q.filter === 'reported') {
      const reported = await this.prisma.report.findMany({
        where: { userId: { not: null } },
        distinct: ['userId'],
        select: { userId: true },
      });
      and.push({ id: { in: reported.map((r) => r.userId!) } });
    }
    if (q.filter === 'restricted') and.push({ OR: [{ bannedAt: { not: null } }, { suspendedUntil: { gt: now } }] });
    if (q.filter === 'under18') and.push({ birthday: { gt: adultBornBy(now) } });
    if (q.filter === 'plus') and.push({ plusUntil: { gt: now } });
    const where = { AND: and };
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({ where, orderBy: { createdAt: 'desc' }, take: PAGE }),
      this.prisma.user.count({ where }),
    ]);
    return { accounts: await this.rows(users, now), total };
  }

  async detail(teamId: string, userId: string, now = new Date()): Promise<AdminAccountDetail> {
    await requireTeam(this.prisma, teamId);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException();
    const [[row], accounts, roomsOwned, actions] = await Promise.all([
      this.rows([user], now),
      this.prisma.account.findMany({ where: { userId }, select: { providerId: true } }),
      this.prisma.membership.count({ where: { userId, role: 'owner' } }),
      this.prisma.accountAction.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 20 }),
    ]);
    const by = await this.prisma.user.findMany({ where: { id: { in: actions.map((a) => a.byId) } }, select: { id: true, name: true } });
    const name = new Map(by.map((u) => [u.id, u.name]));
    return {
      ...row!,
      email: user.email,
      // An email code always works; Google and Discord only when linked
      signIn: ['email code', ...accounts.map((a) => a.providerId).filter((p) => p !== 'credential')],
      age: !user.birthday ? 'unknown' : user.birthday > adultBornBy(now) ? 'under 18' : '18+',
      roomsOwned,
      actions: actions.map((a) => ({
        kind: a.kind,
        reason: a.reason,
        until: a.until?.toISOString() ?? null,
        by: name.get(a.byId) ?? 'Connecta team',
        at: a.createdAt.toISOString(),
      })),
    };
  }

  async act(
    teamId: string,
    userId: string,
    input: { kind: AccountActionInput; reason: string },
    now = new Date(),
  ): Promise<AdminAccountDetail> {
    await requireTeam(this.prisma, teamId);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException();
    if (user.team) throw new ForbiddenException('They’re on the Connecta team: take them off it first');
    const kind: AccountActionKind = input.kind.startsWith('suspend') ? 'suspend' : (input.kind as AccountActionKind);
    const until =
      input.kind === 'suspend_1d' ? new Date(now.getTime() + DAY) : input.kind === 'suspend_7d' ? new Date(now.getTime() + 7 * DAY) : null;
    if (kind === 'lift' && !user.bannedAt && !(user.suspendedUntil && user.suspendedUntil > now)) {
      throw new ForbiddenException('They aren’t suspended or banned');
    }

    const data: Prisma.UserUpdateInput =
      kind === 'suspend'
        ? { suspendedUntil: until }
        : kind === 'ban'
          ? { bannedAt: now, suspendedUntil: null }
          : kind === 'lift'
            ? { bannedAt: null, suspendedUntil: null }
            : kind === 'reset_name'
              ? { name: user.handle ?? 'Guest' }
              : {};
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data }),
      this.prisma.accountAction.create({ data: { userId, kind, until, reason: input.reason, byId: teamId } }),
    ]);
    if (kind === 'suspend' || kind === 'ban') await this.signOutEverywhere(userId);
    await this.audit.record({
      by: teamId,
      action: `account.${kind}`,
      targetKind: 'user',
      targetId: userId,
      reason: input.reason,
      details: { name: user.name, handle: user.handle, ...(until && { until: until.toISOString() }) },
    });
    // Guests have no mailbox
    if (!user.email.endsWith(`@${GUEST_EMAIL_DOMAIN}`)) await this.mail.deliver(accountMail(user.email, kind, input.reason, until));
    return this.detail(teamId, userId, now);
  }

  /** Every session ends now: open tabs hear it and go to sign-in, rooms let them go */
  private async signOutEverywhere(userId: string) {
    await this.prisma.session.deleteMany({ where: { userId } });
    this.live.signOut(userId);
    this.game.roomEvent({ roomId: '*', type: 'kick', userId });
  }

  private async rows(users: User[], now: Date): Promise<AdminAccount[]> {
    const ids = users.map((u) => u.id);
    const [reports, warns] = await Promise.all([
      this.prisma.report.groupBy({ by: ['userId'], where: { userId: { in: ids } }, _count: { _all: true } }),
      this.prisma.accountAction.findMany({
        where: { userId: { in: ids }, kind: 'warn', createdAt: { gt: new Date(now.getTime() - WARNED_DAYS * DAY) } },
        select: { userId: true },
      }),
    ]);
    const reported = new Map(reports.map((r) => [r.userId, r._count._all]));
    const warned = new Set(warns.map((w) => w.userId));
    return users.map((u) => {
      const suspended = !!u.suspendedUntil && u.suspendedUntil > now;
      return {
        id: u.id,
        name: u.name,
        handle: u.handle,
        look: (u.look as AdminAccount['look']) ?? null,
        plus: hasPlus(u, now),
        team: u.team,
        status: u.bannedAt ? 'banned' : suspended ? 'suspended' : warned.has(u.id) ? 'warned' : 'active',
        until: suspended ? u.suspendedUntil!.toISOString() : null,
        reports: reported.get(u.id) ?? 0,
        joinedAt: u.createdAt.toISOString(),
        lastSeenAt: u.lastSeenAt?.toISOString() ?? null,
      };
    });
  }
}

/** Born on or before this day: 18 or older now */
export function adultBornBy(now: Date) {
  return new Date(Date.UTC(now.getUTCFullYear() - 18, now.getUTCMonth(), now.getUTCDate()));
}
