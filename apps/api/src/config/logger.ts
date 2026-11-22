import { ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import type { Env } from './env.js';

/** pino logs for both entry points (the API and the gateway). */
export const loggerModule = LoggerModule.forRootAsync({
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
});
