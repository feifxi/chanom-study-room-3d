import { MESSAGE_MAX, MESSAGES_PAGE } from '@connecta/shared';
import { z } from 'zod';
import { PersonSchema } from '../rooms/rooms.schemas.js';

export const ReactionSchema = z
  .object({
    emoji: z.string(),
    /** Who reacted, so each viewer can tell if one is theirs */
    userIds: z.array(z.string()),
  })
  .meta({ id: 'Reaction' });

export const PictureSchema = z.object({ url: z.string(), width: z.number().int(), height: z.number().int() }).meta({ id: 'Picture' });

export const ChatMessageSchema = z
  .object({
    id: z.string(),
    roomId: z.string(),
    author: PersonSchema,
    text: z.string(),
    /** The message this one answers, quoted above it */
    replyTo: z
      .object({
        id: z.string(),
        author: PersonSchema,
        text: z.string(),
        /** The original was deleted: "Original message was deleted" */
        deleted: z.boolean(),
        hasPictures: z.boolean(),
      })
      .nullable(),
    /** User ids it @mentions (members only) */
    mentions: z.array(z.string()),
    /** @room: pings everyone (owner and mods only) */
    mentionsRoom: z.boolean(),
    createdAt: z.iso.datetime(),
    editedAt: z.iso.datetime().nullable(),
    pictures: z.array(PictureSchema),
    reactions: z.array(ReactionSchema),
  })
  .meta({ id: 'ChatMessage' });
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const MessagePageSchema = z
  .object({
    /** Oldest first */
    messages: z.array(ChatMessageSchema),
    /** There are older messages: ask again with before = the first id */
    hasMore: z.boolean(),
    /** Your read marker when the page was loaded: "New messages" goes after it */
    lastReadId: z.string().nullable(),
  })
  .meta({ id: 'MessagePage' });
export type MessagePage = z.infer<typeof MessagePageSchema>;

export const MessagePageQuerySchema = z
  .object({
    before: z.string().max(40).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(MESSAGES_PAGE),
  })
  .meta({ id: 'MessagePageQuery' });

const Text = z.string().trim().max(MESSAGE_MAX);

export const SendMessageBodySchema = z
  .object({ text: Text, replyToId: z.string().max(40).optional() })
  .refine((b) => b.text.length > 0, { message: 'Write something first', path: ['text'] })
  .meta({ id: 'SendMessageBody' });

export const EditMessageBodySchema = z.object({ text: Text.min(1) }).meta({ id: 'EditMessageBody' });

export const ReactionBodySchema = z.object({ emoji: z.string().min(1).max(16) }).meta({ id: 'ReactionBody' });

export const ReadBodySchema = z.object({ messageId: z.string().max(40) }).meta({ id: 'ReadBody' });
