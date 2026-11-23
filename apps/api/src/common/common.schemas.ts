import { COMMON_TYPE_IDS } from '@connecta/shared';
import { z } from 'zod';
import { PersonSchema } from '../rooms/rooms.schemas.js';

/** A Common room type on Discover and Home (feature 14): everyone across its copies */
export const CommonRoomSchema = z
  .object({
    id: z.enum(COMMON_TYPE_IDS as [string, ...string[]]),
    name: z.string(),
    mapId: z.string(),
    vibe: z.string(),
    roomWideGames: z.boolean(),
    /** People inside across all copies */
    here: z.number().int(),
    copies: z.number().int(),
    /** Your friends inside (any copy) */
    friendsInside: z.array(PersonSchema),
  })
  .meta({ id: 'CommonRoom' });
export type CommonRoomView = z.infer<typeof CommonRoomSchema>;

export const CommonTicketBodySchema = z
  .object({
    /** Join this friend's copy (their account id) */
    with: z.string().max(40).optional(),
    /** Back to the copy you were in (Try again, a reload), if it still has a seat */
    copy: z.number().int().positive().max(9999).optional(),
  })
  .meta({ id: 'CommonTicketBody' });

export const CommonTicketSchema = z
  .object({
    ticket: z.string(),
    /** The copy's room id on the game server */
    place: z.string(),
    n: z.number().int(),
    name: z.string(),
    /** "Mai's copy is full, so you're in #3." */
    note: z.string().nullable(),
  })
  .meta({ id: 'CommonTicket' });
export type CommonTicket = z.infer<typeof CommonTicketSchema>;
