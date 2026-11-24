import 'dotenv/config';
import { listen } from 'colyseus';
import { loadEnv } from './env.js';
import { log } from './log.js';
import { connectRedis } from './redis.js';
import { gameServer } from './server.js';
import { liveKitVoice, voice } from './voice.js';

/**
 * The game server: the web app reaches it at /game on its own origin (nginx, or a
 * Next rewrite locally), with a join ticket from the API.
 */
const env = loadEnv();
const close = await connectRedis(env.REDIS_URL, env.NODE_ENV);
voice.current = liveKitVoice({
  url: env.LIVEKIT_URL,
  publicUrl: env.LIVEKIT_PUBLIC_URL,
  key: env.LIVEKIT_API_KEY,
  secret: env.LIVEKIT_API_SECRET,
});
const server = gameServer(env.GAME_SECRET);
server.onShutdown(close);
await listen(server, env.PORT);
log.info({ port: env.PORT }, 'game server listening');
