import { CARD_KINDS } from '../chat/chat.schemas.js';
import { z } from 'zod';
import { PersonSchema } from '../rooms/rooms.schemas.js';

/** Where you stand with the other person: only friends can send. */
const Standing = {
  /** Friends now: you can message them */
  friend: z.boolean(),
  /** You blocked them (they can't message you) */
  blocked: z.boolean(),
  /** You muted this chat: left out of the Messages badge, no toasts in a room */
  muted: z.boolean(),
};

export const DmSummarySchema = z
  .object({
    id: z.string(),
    with: PersonSchema,
    ...Standing,
    /** The newest message, for the list */
    last: z
      .object({
        kind: z.enum(CARD_KINDS),
        text: z.string(),
        mine: z.boolean(),
        pictures: z.boolean(),
        deleted: z.boolean(),
        createdAt: z.iso.datetime(),
      })
      .nullable(),
    /** Their messages after your read marker */
    unread: z.number().int(),
  })
  .meta({ id: 'DmSummary' });
export type DmSummary = z.infer<typeof DmSummarySchema>;

export const MuteBodySchema = z.object({ muted: z.boolean() }).meta({ id: 'MuteBody' });

export const InviteToRoomBodySchema = z.object({ roomId: z.string().max(40) }).meta({ id: 'InviteToRoomBody' });
export const AnswerAskBodySchema = z.object({ send: z.boolean() }).meta({ id: 'AnswerAskBody' });

export const DmOpenSchema = z
  .object({
    /** Null when there's no chat yet and you're not friends (nothing to show or send) */
    id: z.string().nullable(),
    with: PersonSchema,
    ...Standing,
    /** Rooms you're both members of */
    sharedRooms: z.array(z.object({ id: z.string(), name: z.string(), emoji: z.string(), mapId: z.string() })),
  })
  .meta({ id: 'DmOpen' });
export type DmOpen = z.infer<typeof DmOpenSchema>;
