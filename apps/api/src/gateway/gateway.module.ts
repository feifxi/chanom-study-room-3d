import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { authFromConfig } from '../auth/auth.js';
import { validateEnv, type Env } from '../config/env.js';
import { loggerModule } from '../config/logger.js';
import { LiveModule } from '../live/live.module.js';
import { MailModule } from '../mail/mail.module.js';
import { PresenceModule } from '../presence/presence.module.js';
import { MailService } from '../mail/mail.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { GATEWAY_AUTH, LiveGateway } from './live.gateway.js';

/** The gateway entry point's app (src/gateway.ts): the live connection and what it needs. */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnv }),
    loggerModule,
    PrismaModule,
    MailModule,
    LiveModule,
    PresenceModule,
  ],
  providers: [
    LiveGateway,
    {
      provide: GATEWAY_AUTH,
      inject: [ConfigService, PrismaService, MailService],
      useFactory: (config: ConfigService<Env, true>, prisma: PrismaService, mail: MailService) => authFromConfig(config, prisma, mail),
    },
  ],
})
export class GatewayModule {}
