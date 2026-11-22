import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { AccountsModule } from './accounts/accounts.module.js';
import { FriendsModule } from './friends/friends.module.js';
import { RoomsModule } from './rooms/rooms.module.js';
import { authFromConfig } from './auth/auth.js';
import { validateEnv, type Env } from './config/env.js';
import { loggerModule } from './config/logger.js';
import { LiveModule } from './live/live.module.js';
import { HealthModule } from './health/health.module.js';
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
    HealthModule,
    AccountsModule,
    RoomsModule,
    FriendsModule,
    LiveModule,
  ],
})
export class AppModule {}
