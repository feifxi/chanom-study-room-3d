import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { AccountsModule } from './accounts/accounts.module.js';
import { DmsModule } from './dms/dms.module.js';
import { DecksModule } from './decks/decks.module.js';
import { FocusModule } from './focus/focus.module.js';
import { FriendsModule } from './friends/friends.module.js';
import { RoomsModule } from './rooms/rooms.module.js';
import { authFromConfig } from './auth/auth.js';
import { validateEnv, type Env } from './config/env.js';
import { loggerModule } from './config/logger.js';
import { redisOptions } from './config/redis.js';
import { LiveModule } from './live/live.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { PresenceModule } from './presence/presence.module.js';
import { StorageModule } from './storage/storage.module.js';
import { HealthModule } from './health/health.module.js';
import { GameModule } from './game/game.module.js';
import { MailModule } from './mail/mail.module.js';
import { MailService } from './mail/mail.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { PrismaService } from './prisma/prisma.service.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnv }),
    loggerModule,
    PrismaModule,
    // Better Auth under /api/auth/*, plus a global guard: every route needs a session unless it's
    // marked @AllowAnonymous() or @OptionalAuth()
    AuthModule.forRootAsync({
      imports: [MailModule],
      inject: [ConfigService, PrismaService, MailService],
      useFactory: (config: ConfigService<Env, true>, prisma: PrismaService, mail: MailService) => ({
        auth: authFromConfig(config, prisma, mail),
      }),
    }),
    // Per-route limits (@Throttle) on endpoints people could hammer. In memory: one API process for now
    ThrottlerModule.forRoot([{ limit: 120, ttl: 60_000 }]),
    // Timed jobs (@Cron), in this process for now
    ScheduleModule.forRoot(),
    // Background jobs (the pictures worker) on Redis, also in this process for now. Each
    // environment gets its own prefix, so tests never hand jobs to a running dev server
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        connection: redisOptions(config.get('REDIS_URL', { infer: true })),
        prefix: `connecta:${config.get('NODE_ENV', { infer: true })}`,
      }),
    }),
    HealthModule,
    AccountsModule,
    RoomsModule,
    FriendsModule,
    DmsModule,
    FocusModule,
    DecksModule,
    LiveModule,
    PresenceModule,
    NotificationsModule,
    GameModule,
    StorageModule,
  ],
})
export class AppModule {}
