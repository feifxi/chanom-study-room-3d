import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { LoggerModule } from 'nestjs-pino';
import { AccountsModule } from './accounts/accounts.module.js';
import { FriendsModule } from './friends/friends.module.js';
import { RoomsModule } from './rooms/rooms.module.js';
import { createAuth } from './auth/auth.js';
import { validateEnv, type Env } from './config/env.js';
import { HealthModule } from './health/health.module.js';
import { MailModule } from './mail/mail.module.js';
import { MailService } from './mail/mail.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { PrismaService } from './prisma/prisma.service.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnv }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        pinoHttp: {
          level: config.get('LOG_LEVEL', { infer: true }),
          // JSON lines in production (shipped to the log store); readable lines locally
          transport: config.get('NODE_ENV', { infer: true }) === 'development' ? { target: 'pino-pretty' } : undefined,
          // Health checks run every few seconds; logging each one buries the requests that matter
          autoLogging: { ignore: (req) => req.url === '/api/health' },
          redact: ['req.headers.authorization', 'req.headers.cookie'],
        },
      }),
    }),
    PrismaModule,
    // Better Auth under /api/auth/*, plus a global guard: every route needs a session unless it's
    // marked @AllowAnonymous() or @OptionalAuth()
    AuthModule.forRootAsync({
      imports: [MailModule],
      inject: [ConfigService, PrismaService, MailService],
      useFactory: (config: ConfigService<Env, true>, prisma: PrismaService, mail: MailService) => ({
        auth: createAuth({
          env: {
            NODE_ENV: config.get('NODE_ENV', { infer: true }),
            WEB_ORIGIN: config.get('WEB_ORIGIN', { infer: true }),
            AUTH_SECRET: config.get('AUTH_SECRET', { infer: true }),
            GOOGLE_CLIENT_ID: config.get('GOOGLE_CLIENT_ID', { infer: true }),
            GOOGLE_CLIENT_SECRET: config.get('GOOGLE_CLIENT_SECRET', { infer: true }),
            DISCORD_CLIENT_ID: config.get('DISCORD_CLIENT_ID', { infer: true }),
            DISCORD_CLIENT_SECRET: config.get('DISCORD_CLIENT_SECRET', { infer: true }),
          },
          prisma,
          mail,
        }),
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
  ],
})
export class AppModule {}
