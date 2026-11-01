/**
 * Steady HTTP traffic against the room list (game server) and the REST API so the SLO panels have data:
 *   pnpm --filter @study/game load [requestsPerSecond=5] [minutes=10]
 * Pair it with `bots` for WebSocket sessions and with CHAOS_* env vars to burn the budget.
 */
const GAME = process.env.GAME_URL ?? 'http://localhost:2567';
const API = process.env.API_URL ?? 'http://localhost:2568/api';
const rps = Number(process.argv[2] ?? 5);
const minutes = Number(process.argv[3] ?? 10);
const visitor = `load-${Math.random().toString(36).slice(2, 10)}`;

const ROUTES = [`${GAME}/rooms`, `${GAME}/rooms`, `${API}/leaderboard`, `${API}/leaderboard?period=today`, `${API}/stats/${visitor}`];
const counts = { ok: 0, errors: 0, slow: 0 };

async function hit() {
  const url = ROUTES[Math.floor(Math.random() * ROUTES.length)]!;
  const start = performance.now();
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (res.status >= 500) counts.errors++;
    else counts.ok++;
  } catch {
    counts.errors++;
  }
  if (performance.now() - start > 300) counts.slow++;
}

console.log(`Sending ~${rps} req/s to ${GAME} and ${API} for ${minutes} min (Ctrl+C to stop)`);
const timer = setInterval(() => void hit(), 1000 / rps);
const report = setInterval(() => console.log(`ok ${counts.ok} · 5xx/failed ${counts.errors} · slower than 300 ms ${counts.slow}`), 10_000);
setTimeout(() => {
  clearInterval(timer);
  clearInterval(report);
  console.log('done', counts);
}, minutes * 60_000);

// A module, so its top-level names don't clash with the other scripts
export {};
