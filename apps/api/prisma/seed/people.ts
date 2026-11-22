import type { AvatarLook } from '@connecta/shared';
import type { PrismaClient } from '../../src/generated/prisma/client.js';

/** Stable ids, so other seed files (rooms, friends, DMs) can point at these people. */
export const seedUserId = (handle: string) => `seed_${handle.replace('.', '_')}`;

/**
 * The demo's people, as finished accounts. Sign in as any of them with an email code: the address is
 * <handle>@connecta.test and the code arrives in Mailpit (http://localhost:8025).
 */
const PEOPLE: { name: string; handle: string; birthday: string; look: AvatarLook }[] = [
  { name: 'Mai', handle: 'maimai', birthday: '2005-03-02', look: { hair: '#a58be8', outfit: '#7c5cff', accessory: 'ribbon' } },
  { name: 'Jod', handle: 'jod.dev', birthday: '2003-07-19', look: { hair: '#46527f', outfit: '#2f80ed', accessory: 'headphones' } },
  { name: 'Ken', handle: 'kenken', birthday: '2004-11-30', look: { hair: '#34313f', outfit: '#12a37f', accessory: 'glasses' } },
  { name: 'Ploy', handle: 'ployy', birthday: '2006-01-08', look: { hair: '#f7b267', outfit: '#ef8a3c', accessory: 'twintails' } },
  { name: 'Nam', handle: 'namwhan', birthday: '2005-09-14', look: { hair: '#c8e3ff', outfit: '#2f80ed', accessory: 'ahoge' } },
  { name: 'Bow', handle: 'bowbow', birthday: '2007-04-25', look: { hair: '#f59ac0', outfit: '#e84855', accessory: 'ribbon' } },
  { name: 'Pim', handle: 'pimmy', birthday: '2004-12-12', look: { hair: '#8fdcc0', outfit: '#12a37f', accessory: 'none' } },
  { name: 'Mook', handle: 'mookie', birthday: '2006-06-06', look: { hair: '#f59ac0', outfit: '#7c5cff', accessory: 'headphones' } },
  { name: 'Earth', handle: 'earth.k', birthday: '2003-02-17', look: { hair: '#34313f', outfit: '#2f80ed', accessory: 'glasses' } },
];

export async function seedPeople(prisma: PrismaClient) {
  let count = 0;
  for (const p of PEOPLE) {
    const id = seedUserId(p.handle);
    // Your own local account may have taken a seed handle: leave yours alone
    const holder = await prisma.user.findUnique({ where: { handle: p.handle }, select: { id: true, email: true } });
    if (holder && holder.id !== id) {
      console.warn(`People: skipped @${p.handle}, your own account ${holder.email} has it`);
      continue;
    }
    const data = {
      name: p.name,
      email: `${p.handle}@connecta.test`,
      emailVerified: true,
      handle: p.handle,
      // Free to change the handle right away, like a new account
      handleChangedAt: null,
      birthday: new Date(p.birthday),
      look: { ...p.look },
      // Brings back a seed person you deleted (or asked to delete) while trying things out
      deleteAt: null,
      deletedAt: null,
    };
    // Keyed by the fixed id, so running again updates instead of duplicating
    await prisma.$transaction([
      prisma.handleHold.deleteMany({ where: { handle: p.handle, userId: id } }),
      prisma.user.upsert({ where: { id }, create: { id, ...data }, update: data }),
    ]);
    count++;
  }
  console.log(`People: ${count} (sign in as <handle>@connecta.test, e.g. maimai@connecta.test)`);
}
