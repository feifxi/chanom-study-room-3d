import { z } from 'zod';
import { PresenceSchema } from '../presence/presence.schemas.js';
import { PersonSchema } from '../rooms/rooms.schemas.js';

export const FriendSchema = z.object({ person: PersonSchema, since: z.iso.datetime(), presence: PresenceSchema }).meta({ id: 'Friend' });
export type Friend = z.infer<typeof FriendSchema>;

export const IncomingRequestSchema = z
  .object({
    person: PersonSchema,
    at: z.iso.datetime(),
    /** Rooms you're both members of, so you know where they're from */
    shared: z.array(z.string()),
  })
  .meta({ id: 'IncomingRequest' });

export const SentRequestSchema = z.object({ person: PersonSchema, at: z.iso.datetime() }).meta({ id: 'SentRequest' });

export const FriendRequestsSchema = z
  .object({
    incoming: z.array(IncomingRequestSchema),
    /** Always "Pending" until accepted, cancelled or expired: ignoring is never shown */
    sent: z.array(SentRequestSchema),
    /** Requests you can still send today */
    leftToday: z.number().int(),
  })
  .meta({ id: 'FriendRequests' });
export type FriendRequests = z.infer<typeof FriendRequestsSchema>;

export const AddFriendBodySchema = z
  .object({ handle: z.string().trim().min(1).max(40).describe('Exact @handle, with or without the @') })
  .meta({ id: 'AddFriendBody' });

export const AddFriendResultSchema = z
  .object({
    /** sent: a request is waiting; friends: they'd already asked you, so you're friends now */
    status: z.enum(['sent', 'friends']),
    person: PersonSchema,
  })
  .meta({ id: 'AddFriendResult' });
export type AddFriendResult = z.infer<typeof AddFriendResultSchema>;

export const BlockedSchema = z.object({ person: PersonSchema, at: z.iso.datetime() }).meta({ id: 'Blocked' });
export type Blocked = z.infer<typeof BlockedSchema>;
