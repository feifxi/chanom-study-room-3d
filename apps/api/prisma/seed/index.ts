// Local development data: `pnpm db:seed`. One fill of every feature's
// data for trying the whole app: the seed people, four rooms with their chat, friends, DMs, Pick a
// Side decks, two weeks of focus, coins and Shop items, Plus and its payments, reports and the 🔔
// inbox (who's who: docs/manual-tests.md#the-seed). Running it again replaces what it made, and
// resets what you did as a seed person; your own accounts stay. Times are relative to the run, so
// "today" and "the last 24 hours" always have something in them.
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { validateEnv } from '../../src/config/env.js';
import { PrismaClient } from '../../src/generated/prisma/client.js';
import { seedChat } from './chat.js';
import { seedCoins } from './coins.js';
import { seedDecks } from './decks.js';
import { seedFocus } from './focus.js';
import { seedFriends } from './friends.js';
import { seedInbox } from './inbox.js';
import { seedModeration } from './moderation.js';
import { seedPeople } from './people.js';
import { seedPlus } from './plus.js';
import { resetSeed } from './reset.js';
import { seedRooms } from './rooms.js';
import { seedStorage } from './storage.js';

const env = validateEnv(process.env);
if (env.NODE_ENV === 'production') throw new Error('The seed is for local development only');

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: env.DATABASE_URL }) });
try {
  // In dependency order: later steps use what earlier ones made
  await seedPeople(prisma);
  await resetSeed(prisma);
  await seedStorage(env);
  await seedRooms(prisma);
  await seedFriends(prisma);
  await seedChat(prisma, env);
  await seedDecks(prisma);
  await seedFocus(prisma);
  await seedCoins(prisma);
  await seedPlus(prisma);
  await seedModeration(prisma);
  await seedInbox(prisma);
} finally {
  await prisma.$disconnect();
}
