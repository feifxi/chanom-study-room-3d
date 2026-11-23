// Puts someone on the Connecta team, or takes them off: `pnpm --filter @connecta/api team <handle> [off]`.
// The app never sets the flag itself (feature 14): the team acts in Common rooms and, later, the admin site.
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { validateEnv } from '../src/config/env.js';
import { PrismaClient } from '../src/generated/prisma/client.js';

const [handle, off] = process.argv.slice(2);
if (!handle || (off && off !== 'off')) {
  console.error('Usage: pnpm --filter @connecta/api team <handle> [off]');
  process.exit(1);
}
const env = validateEnv(process.env);
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: env.DATABASE_URL }) });
try {
  const user = await prisma.user.update({ where: { handle: handle.replace(/^@/, '') }, data: { team: off !== 'off' } });
  console.log(`@${user.handle} is ${user.team ? 'on' : 'off'} the Connecta team`);
} catch {
  console.error(`No one has @${handle}`);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
