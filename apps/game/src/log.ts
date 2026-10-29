import pino, { type TransportTargetOptions } from 'pino';

/**
 * Structured logs. Production writes JSON to stdout (collected from the container).
 * In dev the terminal gets readable lines, and with LOG_FILE set the same events are
 * also written as JSON for Grafana Alloy to ship to Loki (see ops/).
 */
const level = process.env.LOG_LEVEL ?? 'info';

function devTargets(): TransportTargetOptions[] {
  const targets: TransportTargetOptions[] = [
    { target: 'pino-pretty', level, options: { destination: 1, colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' } },
  ];
  if (process.env.LOG_FILE) targets.push({ target: 'pino/file', level, options: { destination: process.env.LOG_FILE, mkdir: true } });
  return targets;
}

export const log =
  process.env.NODE_ENV === 'production'
    ? pino({ level, base: { service: 'game' } })
    : pino({ level, base: { service: 'game' } }, pino.transport({ targets: devTargets() }));
