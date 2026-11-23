import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PERSON_REASONS, ROOM_REASONS } from '@connecta/shared';
import type { Report } from '../generated/prisma/client.js';
import { AuditService } from '../audit/audit.service.js';
import { ChatService } from '../chat/chat.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AccountsAdminService } from './accounts-admin.service.js';
import { RoomsAdminService } from './rooms-admin.service.js';
import { REPORT_DECISIONS, type ReportCase, type ReportCaseList, type ReportDecision } from './admin.schemas.js';
import { requireTeam } from './team.js';

const LABEL = new Map<string, string>([...PERSON_REASONS, ...ROOM_REASONS].map((r) => [r.id, r.label]));
/** Reasons that go to the top of the queue */
const URGENT = new Set(['sexual', 'room_danger']);
const OUTCOME: Record<ReportDecision, string> = {
  warn: 'Warned',
  suspend_1d: 'Suspended 1 day',
  suspend_7d: 'Suspended 7 days',
  ban: 'Banned',
  delete: 'Message deleted',
  delete_warn: 'Message deleted + warned',
  delete_suspend_1d: 'Message deleted + suspended 1 day',
  delist: 'Delisted from Discover',
  close: 'Room closed',
  close_suspend_owner: 'Room closed + owner suspended 7 days',
  dismiss: 'Dismissed',
};

type Line = { id?: string; by: string; byId?: string; text: string; at?: string };
type Context = {
  reported?: { name: string; handle: string | null };
  message?: Line;
  around?: Line[];
  recent?: Line[];
  bubblesSeen?: string[];
  placeName?: string | null;
  room?: { name: string; description: string; rules: string; ownerId: string | null };
};

const keyOf = (r: Report) => `${r.kind}:${r.kind === 'message' ? r.messageId : r.kind === 'room' ? r.place : r.userId}`;

/**
 * The reports queue (admin site): reports grouped into cases, urgent first, and the team's decision,
 * which acts (through the same account actions as the Users page) and closes every report in the case.
 */
@Injectable()
export class ReportsAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: AccountsAdminService,
    private readonly rooms: RoomsAdminService,
    private readonly chat: ChatService,
    private readonly audit: AuditService,
  ) {}

  async list(teamId: string, status: 'open' | 'done' = 'open'): Promise<ReportCaseList> {
    await requireTeam(this.prisma, teamId);
    const [rows, openRows] = await Promise.all([
      this.prisma.report.findMany({
        where: { status },
        orderBy: { createdAt: status === 'open' ? 'asc' : 'desc' },
        take: status === 'open' ? 1000 : 300,
      }),
      status === 'open'
        ? null
        : this.prisma.report.findMany({ where: { status: 'open' }, select: { kind: true, messageId: true, place: true, userId: true } }),
    ]);
    // Done cases are grouped per decision, open ones per target
    const groups = new Map<string, Report[]>();
    for (const r of rows) {
      const k = status === 'open' ? keyOf(r) : `${keyOf(r)}@${r.decidedAt?.toISOString()}`;
      groups.set(k, [...(groups.get(k) ?? []), r]);
    }
    const cases = await Promise.all([...groups.values()].map((g) => this.toCase(g)));
    cases.sort((a, b) =>
      status === 'open'
        ? Number(b.urgent) - Number(a.urgent) || a.firstAt.localeCompare(b.firstAt)
        : b.decidedAt!.localeCompare(a.decidedAt!),
    );
    const open = status === 'open' ? cases.length : new Set((openRows ?? []).map((r) => keyOf(r as Report))).size;
    return { cases, open };
  }

  async decide(teamId: string, key: string, input: { action: string; reason?: string }, now = new Date()): Promise<void> {
    await requireTeam(this.prisma, teamId);
    const open = (await this.prisma.report.findMany({ where: { status: 'open' } })).filter((r) => keyOf(r) === key);
    if (!open.length) throw new NotFoundException('That case is closed or gone');
    const first = open[0]!;
    const kind = first.kind as keyof typeof REPORT_DECISIONS;
    const action = input.action as ReportDecision;
    if (!(REPORT_DECISIONS[kind] as readonly string[]).includes(action))
      throw new BadRequestException('That action is for another kind of report');
    const reason = input.reason?.trim() || [...new Set(open.map((r) => LABEL.get(r.reason) ?? r.reason))].join(', ');

    if (kind === 'person' && action !== 'dismiss') {
      await this.accounts.act(teamId, first.userId!, { kind: action as 'warn' | 'suspend_1d' | 'suspend_7d' | 'ban', reason }, now);
    }
    if (kind === 'message' && action !== 'dismiss') {
      const message = await this.prisma.message.findUnique({
        where: { id: first.messageId! },
        include: { dm: { select: { pair: true } } },
      });
      if (message && !message.deletedAt) await this.chat.erase(message);
      await this.audit.record({
        by: teamId,
        action: 'message.delete',
        targetKind: 'message',
        targetId: first.messageId!,
        reason,
        details: { authorId: first.userId },
      });
      if (action !== 'delete')
        await this.accounts.act(teamId, first.userId!, { kind: action === 'delete_warn' ? 'warn' : 'suspend_1d', reason }, now);
    }
    if (kind === 'room' && action !== 'dismiss') {
      const roomId = first.place!;
      const room = await this.prisma.room.findUnique({ where: { id: roomId }, select: { closedAt: true, delistedAt: true } });
      if (room) {
        const close = action !== 'delist';
        // The same as the Rooms page (the owner is emailed why); already done is fine
        if (close ? !room.closedAt : !room.delistedAt && !room.closedAt) {
          await this.rooms.act(teamId, roomId, { kind: close ? 'close' : 'delist', reason }, now);
        }
        if (action === 'close_suspend_owner') {
          const owner = await this.prisma.membership.findFirst({ where: { roomId, role: 'owner' }, select: { userId: true } });
          if (owner) await this.accounts.act(teamId, owner.userId, { kind: 'suspend_7d', reason }, now);
        }
      }
    }
    await this.prisma.report.updateMany({
      where: { id: { in: open.map((r) => r.id) } },
      data: { status: 'done', outcome: OUTCOME[action], decidedById: teamId, decidedAt: now },
    });
    await this.audit.record({
      by: teamId,
      action: `report.${action}`,
      targetKind: 'report',
      targetId: key,
      reason,
      details: { reports: open.length },
    });
  }

  private async toCase(group: Report[]): Promise<ReportCase> {
    const latest = group[group.length - 1]!;
    const first = group[0]!;
    const kind = latest.kind as ReportCase['kind'];
    const ctx = (latest.context ?? {}) as Context;
    const reasons = [...new Set(group.map((r) => LABEL.get(r.reason) ?? r.reason))];
    const steps = group.map((r) => r.step).filter((s): s is string => !!s);
    const where = ctx.placeName ?? (latest.dmId ? 'A DM' : kind === 'room' ? 'Discover' : null);
    const auto = steps.includes('common_out')
      ? 'Out of Common rooms for 1 hour (5 reports in 30 minutes)'
      : steps.includes('muted')
        ? `Muted 15 minutes in ${where ?? 'the room'} (3 reports in 10 minutes)`
        : null;

    const context: ReportCase['context'] = [];
    if (kind === 'message' && ctx.message) {
      const around = ctx.around ?? [];
      const before = around.filter((l) => (l.at ?? '') < (ctx.message!.at ?? ''));
      const after = around.filter((l) => (l.at ?? '') >= (ctx.message!.at ?? ''));
      for (const l of before) context.push({ by: l.by, text: l.text, flagged: false, bubble: false });
      context.push({ by: ctx.message.by, text: ctx.message.text, flagged: true, bubble: false });
      for (const l of after) context.push({ by: l.by, text: l.text, flagged: false, bubble: false });
    } else if (kind === 'person') {
      for (const l of ctx.recent ?? []) context.push({ by: l.by, text: l.text, flagged: true, bubble: false });
      const bubbles = [...new Set(group.flatMap((r) => ((r.context ?? {}) as Context).bubblesSeen ?? []))];
      for (const text of bubbles) context.push({ by: ctx.reported?.name ?? 'They', text, flagged: true, bubble: true });
    }

    const done = latest.status === 'done';
    const decidedAt = done ? (latest.decidedAt ?? latest.createdAt).toISOString() : null;
    const [user, room, decider, history] = await Promise.all([
      latest.userId ? this.prisma.user.findUnique({ where: { id: latest.userId }, select: { name: true, handle: true } }) : null,
      kind === 'room' && latest.place ? this.prisma.room.findUnique({ where: { id: latest.place }, select: { name: true } }) : null,
      latest.decidedById ? this.prisma.user.findUnique({ where: { id: latest.decidedById }, select: { name: true } }) : null,
      this.history(latest, group, decidedAt ? new Date(decidedAt) : new Date()),
    ]);
    return {
      key: keyOf(latest),
      kind,
      name: kind === 'room' ? (room?.name ?? ctx.room?.name ?? 'A room') : (user?.name ?? ctx.reported?.name ?? 'Someone'),
      handle: kind === 'room' ? null : (user?.handle ?? ctx.reported?.handle ?? null),
      userId: latest.userId,
      roomId: kind === 'room' ? latest.place : null,
      reasons,
      details: [...new Set(group.map((r) => r.details).filter(Boolean))].slice(0, 5),
      reporters: new Set(group.map((r) => r.reporterId)).size,
      where,
      firstAt: first.createdAt.toISOString(),
      lastAt: latest.createdAt.toISOString(),
      urgent: !done && (group.some((r) => URGENT.has(r.reason)) || steps.length > 0 || new Set(group.map((r) => r.reporterId)).size >= 3),
      auto,
      context,
      room: kind === 'room' && ctx.room ? { description: ctx.room.description, rules: ctx.room.rules } : null,
      history: history,
      status: done ? 'done' : 'open',
      outcome: latest.outcome,
      decidedBy: done ? (decider?.name ?? 'Connecta team') : null,
      decidedAt,
    };
  }

  /** Team actions on the account (or decisions on the room) before this case's decision, newest first */
  private async history(latest: Report, group: Report[], before: Date): Promise<string[]> {
    const day = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    if (latest.kind === 'room') {
      const earlier = await this.prisma.report.findMany({
        where: { kind: 'room', place: latest.place, status: 'done', id: { notIn: group.map((r) => r.id) }, createdAt: { lt: before } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });
      return earlier.map((r) => `${r.outcome ?? 'Decided'} ${day(r.createdAt)}`);
    }
    const actions = await this.prisma.accountAction.findMany({
      where: { userId: latest.userId!, createdAt: { lt: before } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    const verb: Record<string, string> = { warn: 'Warned', suspend: 'Suspended', ban: 'Banned', lift: 'Lifted', reset_name: 'Name reset' };
    return actions.map((a) => `${verb[a.kind] ?? a.kind} ${day(a.createdAt)} (${a.reason})`);
  }
}
