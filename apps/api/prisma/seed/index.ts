// Local development data: `pnpm db:seed`. For now only the demo people (to sign in as) and the S3
// bucket; the full fill of every feature's data is written once, when the whole app is built
// (docs/v2-plan.md, step 6). Rows are written by fixed ids, so running it again is harmless.
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { validateEnv } from '../../src/config/env.js';
import { PrismaClient } from '../../src/generated/prisma/client.js';
import { seedPeople } from './people.js';
import { seedStorage } from './storage.js';

const env = validateEnv(process.env);
if (env.NODE_ENV === 'production') throw new Error('The seed is for local development only');

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: env.DATABASE_URL }) });
try {
  // In dependency order: later steps use what earlier ones made
  await seedPeople(prisma);
  await seedStorage(env);
} finally {
  await prisma.$disconnect();
}
