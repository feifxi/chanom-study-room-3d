import type { Prisma, User } from '../generated/prisma/client.js';

/** The Everyone ranking lists 18+ by default and under-18s only if they turn it on (docs/features/07-study-tools.md). */
export const EVERYONE_DEFAULT_AGE = 18;

const adultBornBy = (now: Date) => {
  const d = new Date(now);
  d.setUTCFullYear(d.getUTCFullYear() - EVERYONE_DEFAULT_AGE);
  return d;
};

/** Whether this account is listed on the Everyone ranking: its own choice, or the default for its age. */
export function listedOnEveryone(user: Pick<User, 'showOnEveryone' | 'birthday' | 'isAnonymous'>, now = new Date()): boolean {
  if (user.isAnonymous) return false;
  if (user.showOnEveryone !== null) return user.showOnEveryone;
  return !!user.birthday && user.birthday <= adultBornBy(now);
}

/** The same rule as a database filter */
export function listedWhere(now = new Date()): Prisma.UserWhereInput {
  return {
    deletedAt: null,
    isAnonymous: false,
    handle: { not: null },
    OR: [{ showOnEveryone: true }, { showOnEveryone: null, birthday: { lte: adultBornBy(now) } }],
  };
}
