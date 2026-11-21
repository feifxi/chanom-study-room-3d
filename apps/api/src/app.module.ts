import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { validateEnv, type Env } from './config/env.js';
import { HealthModule } from './health/health.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

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
    HealthModule,
  ],
})
export class AppModule {}
