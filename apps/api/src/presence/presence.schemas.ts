import { z } from 'zod';

export const PRESENCE_STATUS = ['online', 'idle', 'offline'] as const;
export type PresenceStatus = (typeof PRESENCE_STATUS)[number];

/** The room a friend is in, as you may see it: a private room you're not in is never named. */
export const PresenceRoomSchema = z
  .object({
    /** A private room you're not a member of: no id, name or map */
    hidden: z.boolean(),
    id: z.string().nullable(),
    name: z.string().nullable(),
    emoji: z.string().nullable(),
    mapId: z.string().nullable(),
    /** You're a member: walk straight in */
    member: z.boolean(),
    /** An Open room you're not in yet: join and walk in */
    open: z.boolean(),
  })
  .meta({ id: 'PresenceRoom' });
export type PresenceRoom = z.infer<typeof PresenceRoomSchema>;

/** How a friend looks to you right now. */
export const PresenceSchema = z
  .object({
    status: z.enum(PRESENCE_STATUS),
    /** When they were last online (only when offline, and not while they appear offline) */
    lastSeenAt: z.iso.datetime().nullable(),
    /** "Focusing · Calculus", unless they turned "Show what I'm doing" off (filled in as features port) */
    activity: z.string().nullable(),
    room: PresenceRoomSchema.nullable(),
  })
  .meta({ id: 'Presence' });
export type Presence = z.infer<typeof PresenceSchema>;
