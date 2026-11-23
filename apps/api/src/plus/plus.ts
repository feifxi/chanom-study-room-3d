import { GRACE_DAYS, planOf } from '@connecta/shared';

const DAY_MS = 86_400_000;

/** Has Plus right now (a cancelled Plus counts until its date) */
export const hasPlus = (user: { plusUntil: Date | null } | null | undefined, now = new Date()) => !!user?.plusUntil && user.plusUntil > now;

/** The plan's limits for someone (or a room's owner) */
export const planFor = (user: { plusUntil: Date | null } | null | undefined, now = new Date()) => planOf(hasPlus(user, now));

/**
 * Whether a room still gets its owner's Plus space and maps: while they have Plus, and for the
 * 7-day grace after it ends (spec 15). Personal perks (the ✨ name, uploads, room limits) end on the date.
 */
export const roomPlus = (owner: { plusUntil: Date | null } | null | undefined, now = new Date()) =>
  !!owner?.plusUntil && owner.plusUntil.getTime() + GRACE_DAYS * DAY_MS > now.getTime();
