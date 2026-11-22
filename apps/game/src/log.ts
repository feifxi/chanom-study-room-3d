import { pino } from 'pino';

const env = process.env.NODE_ENV ?? 'development';

/** JSON logs in production, pretty ones locally (like the API). */
export const log = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  ...(env === 'development' && { transport: { target: 'pino-pretty', options: { singleLine: true } } }),
});
