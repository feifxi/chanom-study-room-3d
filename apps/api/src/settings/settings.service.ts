import { Global, Injectable, Logger, Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { DEFAULT_SETTINGS, settingsChannel, settingsKey, type PlatformSettings } from '@connecta/shared';
import { setWordFilter } from '@connecta/shared/moderate';
import type { Env } from '../config/env.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

const ROW = 'platform';
type Switches = Omit<PlatformSettings, 'words'>;

/**
 * The platform settings the team edits on the admin site (Moderation, Common rooms). The database
 * holds them; this keeps them in memory, applies the word filter to this process, and hands the
 * whole set to Redis so every other API process and the game servers apply the same at once.
 */
@Injectable()
export class SettingsService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(SettingsService.name);
  private readonly redis: Redis;
  private readonly sub: Redis;
  private readonly key: string;
  private readonly channel: string;
  private now: PlatformSettings = DEFAULT_SETTINGS;
  private retry?: NodeJS.Timeout;

  constructor(
    config: ConfigService<Env, true>,
    private readonly prisma: PrismaService,
  ) {
    const url = config.get('REDIS_URL', { infer: true });
    this.redis = new Redis(url, { maxRetriesPerRequest: 2 });
    this.sub = new Redis(url, { maxRetriesPerRequest: 2 });
    for (const r of [this.redis, this.sub]) r.on('error', (err) => this.log.warn(`redis: ${err.message}`));
    const env = config.get('NODE_ENV', { infer: true });
    this.key = settingsKey(env);
    this.channel = settingsChannel(env);
  }

  async onModuleInit() {
    await this.sub.subscribe(this.channel);
    // Another API process saved a change
    this.sub.on('message', (_channel, raw) => {
      try {
        this.use(JSON.parse(raw) as PlatformSettings);
      } catch (err) {
        this.log.warn(`bad settings: ${String(err)}`);
      }
    });
    await this.load();
  }

  async onModuleDestroy() {
    clearTimeout(this.retry);
    await Promise.allSettled([this.redis.quit(), this.sub.quit()]);
  }

  /** The database may be down at boot: start anyway (health says so) and keep trying */
  private async load() {
    try {
      await this.publish();
    } catch (err) {
      this.log.warn(`settings not loaded, trying again in 30 s: ${String(err)}`);
      this.retry = setTimeout(() => void this.load(), 30_000);
      this.retry.unref();
    }
  }

  get(): PlatformSettings {
    return this.now;
  }

  /** Change switches or numbers; everyone applies them at once */
  async update(byId: string, patch: Partial<Switches>): Promise<PlatformSettings> {
    const { words: _words, ...current } = this.now;
    const value = { ...current, ...patch };
    await this.prisma.setting.upsert({
      where: { key: ROW },
      create: { key: ROW, value: value as Prisma.InputJsonValue, updatedById: byId },
      update: { value: value as Prisma.InputJsonValue, updatedById: byId },
    });
    return this.publish();
  }

  async addWord(byId: string, word: string): Promise<PlatformSettings> {
    await this.prisma.blockedWord.upsert({ where: { word }, create: { word, addedById: byId }, update: {} });
    return this.publish();
  }

  async removeWord(word: string): Promise<PlatformSettings> {
    await this.prisma.blockedWord.deleteMany({ where: { word } });
    return this.publish();
  }

  /** Read the database, apply here, then hand it to Redis for everyone else */
  async publish(): Promise<PlatformSettings> {
    const [row, words] = await Promise.all([
      this.prisma.setting.findUnique({ where: { key: ROW } }),
      this.prisma.blockedWord.findMany({ orderBy: { createdAt: 'desc' }, select: { word: true } }),
    ]);
    const next: PlatformSettings = {
      ...DEFAULT_SETTINGS,
      ...((row?.value ?? {}) as Partial<Switches>),
      words: words.map((w) => w.word),
    };
    this.use(next);
    const raw = JSON.stringify(next);
    await this.redis
      .multi()
      .set(this.key, raw)
      .publish(this.channel, raw)
      .exec()
      .catch((err: unknown) => this.log.warn(`settings not shared: ${String(err)}`));
    return next;
  }

  private use(next: PlatformSettings) {
    this.now = next;
    setWordFilter({ on: next.wordFilter, words: next.words });
  }
}

@Global()
@Module({ providers: [SettingsService], exports: [SettingsService] })
export class SettingsModule {}
