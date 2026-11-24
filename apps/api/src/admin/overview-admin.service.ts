import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { parseCommonCopy } from '@connecta/shared';
import type { Env } from '../config/env.js';
import { LIVE_PATH } from '../gateway/live.gateway.js';
import { PictureCheck } from '../chat/picture-check.js';
import { StripeGateway } from '../billing/stripe.gateway.js';
import { PresenceService } from '../presence/presence.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { adultBornBy } from './accounts-admin.service.js';
import type { AdminOverview } from './admin.schemas.js';
import { AuditAdminService } from './audit-admin.service.js';
import { ReportsAdminService } from './reports-admin.service.js';
import { requireTeam } from './team.js';

const DAY = 86_400_000;
type Health = AdminOverview['health'][number];

/**
 * The admin site's Overview (docs/features/16-admin.md): how Connecta is doing right now and what needs a person.
 * The health strip asks each part if it's up; deep monitoring waits for the monitoring server
 * (docs/features/15-plus.md).
 */
@Injectable()
export class OverviewAdminService {
  private readonly urls: { game: string; livekit: string; gateway: string };
  private readonly redisUrl: string;

  constructor(
    config: ConfigService<Env, true>,
    private readonly prisma: PrismaService,
    private readonly presence: PresenceService,
    private readonly reports: ReportsAdminService,
    private readonly audit: AuditAdminService,
    private readonly pictures: PictureCheck,
    private readonly stripe: StripeGateway,
  ) {
    this.urls = {
      game: config.get('GAME_URL', { infer: true }),
      livekit: config.get('LIVEKIT_URL', { infer: true }),
      gateway: config.get('GATEWAY_URL', { infer: true }),
    };
    this.redisUrl = config.get('REDIS_URL', { infer: true });
  }

  async overview(teamId: string, now = new Date()): Promise<AdminOverview> {
    await requireTeam(this.prisma, teamId);
    const dayAgo = new Date(now.getTime() - DAY);
    const weekAgo = new Date(now.getTime() - 7 * DAY);
    const [everyone, cases, signUps, under18, plus, plusNew, messages, latest, health] = await Promise.all([
      this.presence.everyone(now.getTime()),
      this.reports.list(teamId, 'open'),
      this.prisma.user.count({ where: { isAnonymous: false, handle: { not: null }, createdAt: { gt: dayAgo } } }),
      this.prisma.user.count({
        where: { isAnonymous: false, handle: { not: null }, createdAt: { gt: dayAgo }, birthday: { gt: adultBornBy(now) } },
      }),
      this.prisma.user.count({ where: { plusUntil: { gt: now } } }),
      this.prisma.payment.count({ where: { createdAt: { gt: weekAgo }, what: { startsWith: 'Plus' }, refundedAt: null } }),
      this.prisma.message.count({ where: { createdAt: { gt: dayAgo } } }),
      this.prisma.auditEntry.findMany({ orderBy: { id: 'desc' }, take: 6 }),
      this.health(),
    ]);
    const rooms = [...everyone.rooms.entries()];
    const common = rooms.filter(([id]) => parseCommonCopy(id));
    const inRooms = rooms.reduce((n, [, c]) => n + c, 0);
    const urgent = cases.cases.filter((c) => c.urgent);
    const n = (x: number) => x.toLocaleString('en');
    return {
      stats: [
        { label: 'Online now', value: n(everyone.online), note: 'people with Connecta open', warn: false },
        {
          label: 'In rooms now',
          value: n(inRooms),
          note: `${rooms.length - common.length} rooms · ${common.length} Common ${common.length === 1 ? 'copy' : 'copies'}`,
          warn: false,
        },
        { label: 'Open reports', value: n(cases.open), note: `${urgent.length} urgent`, warn: urgent.length > 0 },
        { label: 'Sign-ups, last 24 h', value: n(signUps), note: `${under18} under 18`, warn: false },
        { label: 'Plus members', value: n(plus), note: `${plusNew} Plus ${plusNew === 1 ? 'payment' : 'payments'} this week`, warn: false },
        { label: 'Messages, last 24 h', value: n(messages), note: 'room chat and DMs', warn: false },
      ],
      health,
      urgent: urgent.slice(0, 6).map((c) => ({
        key: c.key,
        kind: c.kind,
        name: c.name,
        reasons: c.reasons,
        where: c.where,
        reporters: c.reporters,
        lastAt: c.lastAt,
      })),
      latest: await this.audit.rows(latest),
    };
  }

  /** Each part, asked once with a short timeout: up, slow, or down */
  private async health(): Promise<Health[]> {
    const timed = async (name: string, check: () => Promise<string | void>): Promise<Health> => {
      const start = Date.now();
      try {
        const detail = await Promise.race([
          check(),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('no answer in 2 s')), 2000).unref()),
        ]);
        const ms = Date.now() - start;
        return { name, status: ms > 500 ? 'warn' : 'ok', detail: detail || `answered in ${ms} ms` };
      } catch (err) {
        return { name, status: 'down', detail: err instanceof Error ? err.message : 'not answering' };
      }
    };
    const http = (url: string) => async () => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`answered ${res.status}`);
    };
    const checks = await Promise.all([
      timed('Database', async () => void (await this.prisma.$queryRaw`SELECT 1`)),
      timed('Redis', async () => {
        const redis = new Redis(this.redisUrl, { maxRetriesPerRequest: 1, lazyConnect: true });
        try {
          await redis.connect();
          await redis.ping();
        } finally {
          redis.disconnect();
        }
      }),
      timed('Game server', http(`${this.urls.game}/health`)),
      timed('Voice (LiveKit)', http(this.urls.livekit)),
      timed('Chat gateway', http(`${this.urls.gateway}${LIVE_PATH}/?EIO=4&transport=polling`)),
    ]);
    return [
      ...checks,
      this.pictures.configured
        ? { name: 'Picture check', status: 'ok', detail: 'OpenAI moderation' }
        : { name: 'Picture check', status: 'warn', detail: 'No OPENAI_API_KEY: pictures aren’t checked' },
      this.stripe.enabled
        ? { name: 'Payments', status: 'ok', detail: 'Stripe' }
        : { name: 'Payments', status: 'warn', detail: 'Local stand-in: no Stripe keys' },
    ];
  }
}
