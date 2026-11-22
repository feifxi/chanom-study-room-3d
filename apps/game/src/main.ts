import 'dotenv/config';
import { listen } from 'colyseus';
import { loadEnv } from './env.js';
import { log } from './log.js';
import { connectRedis } from './redis.js';
import { gameServer } from './server.js';

/**
 * The game server (build step 4): the web app reaches it at /game on its own origin (nginx, or a
 * Next rewrite locally), with a join ticket from the API.
 */
const env = loadEnv();
const close = await connectRedis(env.REDIS_URL);
const server = gameServer(env.GAME_SECRET);
server.onShutdown(close);
await listen(server, env.PORT);
log.info({ port: env.PORT }, 'game server listening');
