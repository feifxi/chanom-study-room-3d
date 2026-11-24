import type { AvatarLook } from '@connecta/shared';
import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { SEED_USERS, TIME_ZONE, ago, DAY, seedUserId } from './kit.js';

/**
 * The demo's people, as finished accounts. Sign in as any of them with an email code: the address is
 * <handle>@connecta.test and the code arrives in Mailpit (http://localhost:8025). Fei is on the
 * Connecta team (the admin site opens for her) and Bow is under 18. Plus, coins and Shop items come
 * from their own seed files; a look only uses what its owner has.
 */
const PEOPLE: { name: string; handle: string; birthday: string; look: AvatarLook; joined: number }[] = [
  {
    name: 'Fei',
    handle: 'fei',
    birthday: '2005-03-02',
    look: { hair: '#a58be8', outfit: '#7c5cff', accessory: 'flowerCrown', style: 'hoodie' },
    joined: 70,
  },
  {
    name: 'Ter',
    handle: 'ter',
    birthday: '2003-07-19',
    look: { hair: '#46527f', outfit: '#2f80ed', accessory: 'headphones' },
    joined: 68,
  },
  { name: 'View', handle: 'view', birthday: '2004-11-30', look: { hair: '#34313f', outfit: '#12a37f', accessory: 'glasses' }, joined: 60 },
  {
    name: 'Ploy',
    handle: 'ployy',
    birthday: '2006-01-08',
    look: { hair: '#f7b267', outfit: '#ef8a3c', accessory: 'bunnyEars', style: 'overalls' },
    joined: 66,
  },
  { name: 'Nam', handle: 'namwhan', birthday: '2005-09-14', look: { hair: '#c8e3ff', outfit: '#2f80ed', accessory: 'ahoge' }, joined: 55 },
  // 16: under-18 rules (off the Everyone ranking by default, shown on the admin site)
  { name: 'Bow', handle: 'bowbow', birthday: '2010-04-25', look: { hair: '#f59ac0', outfit: '#e84855', accessory: 'ribbon' }, joined: 20 },
  { name: 'Pim', handle: 'pimmy', birthday: '2004-12-12', look: { hair: '#8fdcc0', outfit: '#12a37f', accessory: 'none' }, joined: 40 },
  {
    name: 'Mook',
    handle: 'mookie',
    birthday: '2006-06-06',
    look: { hair: '#f59ac0', outfit: '#7c5cff', accessory: 'headphones' },
    joined: 50,
  },
  {
    name: 'Earth',
    handle: 'earth.k',
    birthday: '2003-02-17',
    look: { hair: '#34313f', outfit: '#2f80ed', accessory: 'glasses', style: 'raincoat' },
    joined: 62,
  },
];

export async function seedPeople(prisma: PrismaClient) {
  // Seed people who were renamed or dropped (their ids come from handles): everything of theirs goes
  // with them (every link to a user cascades or empties)
  const retired = await prisma.user.deleteMany({ where: { id: { startsWith: 'seed_', notIn: SEED_USERS } } });
  if (retired.count) console.log(`People: removed ${retired.count} old seed accounts`);
  const skipped: string[] = [];
  for (const p of PEOPLE) {
    const id = seedUserId(p.handle);
    // Your own local account may have taken a seed handle: leave yours alone
    const email = `${p.handle}@connecta.test`;
    // Signing in as a seed person before seeding makes an empty account with their email (no
    // handle, sign-up never finished): it's in the way, and there's nothing in it to keep
    await prisma.user.deleteMany({ where: { email, id: { not: id }, handle: null } });
    const holder = await prisma.user.findFirst({ where: { OR: [{ handle: p.handle }, { email }] }, select: { id: true, email: true } });
    if (holder && holder.id !== id) {
      skipped.push(p.handle);
      console.warn(`People: skipped @${p.handle}, your own account ${holder.email} has it`);
      continue;
    }
    const data = {
      name: p.name,
      email,
      emailVerified: true,
      handle: p.handle,
      // Free to change the handle right away, like a new account
      handleChangedAt: null,
      birthday: new Date(p.birthday),
      look: { ...p.look },
      timeZone: TIME_ZONE,
      team: p.handle === 'fei',
      // Back to a clean slate: no suspension, ban, Plus or coins until the files below add them
      suspendedUntil: null,
      bannedAt: null,
      plusUntil: null,
      plusNotice: null,
      coins: 0,
      showOnEveryone: null,
      // Brings back a seed person you deleted (or asked to delete) while trying things out
      deleteAt: null,
      deletedAt: null,
      // Joined a while back, so there's a history (quests, focus) to show
      createdAt: ago(p.joined * DAY),
      lastSeenAt: ago(((p.joined * 7) % 30) * 60_000 + 3_600_000),
    };
    // Keyed by the fixed id, so running again updates instead of duplicating
    await prisma.$transaction([
      prisma.handleHold.deleteMany({ where: { handle: p.handle, userId: id } }),
      prisma.user.upsert({ where: { id }, create: { id, ...data }, update: data }),
    ]);
  }
  // The other seed files assume all nine exist
  if (skipped.length) throw new Error(`Free the handles ${skipped.map((h) => '@' + h).join(', ')} (or pnpm db:reset), then seed again`);
  console.log(`People: ${PEOPLE.length} (sign in as <handle>@connecta.test; Fei is on the Connecta team, Bow is 16)`);
}
