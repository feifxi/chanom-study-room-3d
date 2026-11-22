/** ioredis options from a redis:// URL (BullMQ takes options, not a URL). */
export function redisOptions(url: string) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: Number(u.port || 6379),
    username: u.username || undefined,
    password: u.password ? decodeURIComponent(u.password) : undefined,
    db: u.pathname.length > 1 ? Number(u.pathname.slice(1)) : undefined,
    ...(u.protocol === 'rediss:' && { tls: {} }),
  };
}
