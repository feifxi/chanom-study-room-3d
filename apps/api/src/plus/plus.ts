import { planOf } from '@connecta/shared';

/** Has Plus right now (a cancelled Plus counts until its date) */
export const hasPlus = (user: { plusUntil: Date | null } | null | undefined, now = new Date()) => !!user?.plusUntil && user.plusUntil > now;

/** The plan's limits for someone (or a room's owner) */
export const planFor = (user: { plusUntil: Date | null } | null | undefined, now = new Date()) => planOf(hasPlus(user, now));
