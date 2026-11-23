import { MESSAGE_MAX, MESSAGES_PAGE, PICTURES_MAX } from '@connecta/shared';
import { z } from 'zod';
import { PersonSchema } from '../rooms/rooms.schemas.js';

export const ReactionSchema = z
  .object({
    emoji: z.string(),
    /** Who reacted, so each viewer can tell if one is theirs */
    userIds: z.array(z.string()),
  })
  .meta({ id: 'Reaction' });

export const PictureSchema = z
  .object({
    id: z.string(),
    /** Opens a short-lived link to the WebP (members only) */
    url: z.string(),
    width: z.number().int(),
    height: z.number().int(),
    /** False while the worker is still shrinking and checking it */
    ready: z.boolean(),
  })
  .meta({ id: 'Picture' });

export const PictureUploadBodySchema = z
  .object({
    contentType: z.string().regex(/^image\/[\w.+-]+$/, 'Pick a picture'),
    bytes: z.number().int().positive(),
  })
  .meta({ id: 'PictureUploadBody' });
export type PictureUploadBody = z.infer<typeof PictureUploadBodySchema>;

export const PictureUploadSchema = z
  .object({
    id: z.string(),
    /** PUT the file here, with these headers, within five minutes */
    uploadUrl: z.string(),
    headers: z.record(z.string(), z.string()),
  })
  .meta({ id: 'PictureUpload' });

/**
 * A card in a DM instead of plain text (feature 5): "ask" (the author wants to join the other
 * person's room; they answer Send invite or Not now), "invite" (a link to a room) or "gift" (the
 * author gave the other person Plus, already added; spec 15).
 */
export const CARD_KINDS = ['text', 'ask', 'invite', 'gift'] as const;
export type CardKind = Exclude<(typeof CARD_KINDS)[number], 'text'>;

export const CardSchema = z
  .object({
    /** Ask and invite: the room (null on a gift) */
    roomId: z.string().nullable(),
    /** Ask only: open until answered */
    state: z.enum(['open', 'sent', 'declined']).nullable(),
    /** Invite only: the link and the room it opens */
    invite: z.object({ code: z.string(), kind: z.enum(['member', 'guest']), expiresAt: z.iso.datetime().nullable() }).nullable(),
    room: z.object({ name: z.string(), emoji: z.string(), mapId: z.string() }).nullable(),
    /** Gift only: how long, and the note */
    gift: z.object({ months: z.number().int(), note: z.string().nullable() }).nullable().optional(),
  })
  .meta({ id: 'Card' });
export type Card = z.infer<typeof CardSchema>;

export const ChatMessageSchema = z
  .object({
    id: z.string(),
    /** One of the two: room chat, or a DM */
    roomId: z.string().nullable(),
    dmId: z.string().nullable(),
    author: PersonSchema,
    text: z.string(),
    kind: z.enum(CARD_KINDS),
    card: CardSchema.nullable(),
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
    /** False only for its author, while its pictures are on their way (nobody else sees it yet) */
    ready: z.boolean(),
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
  .object({
    text: Text,
    replyToId: z.string().max(40).optional(),
    /** Uploaded first (POST /api/pictures), in the order to show them */
    pictureIds: z.array(z.string().max(40)).max(PICTURES_MAX).default([]),
  })
  .refine((b) => b.text.length > 0 || b.pictureIds.length > 0, { message: 'Write something first', path: ['text'] })
  .meta({ id: 'SendMessageBody' });

export const EditMessageBodySchema = z.object({ text: Text.min(1) }).meta({ id: 'EditMessageBody' });

export const ReactionBodySchema = z.object({ emoji: z.string().min(1).max(16) }).meta({ id: 'ReactionBody' });

export const ReadBodySchema = z.object({ messageId: z.string().max(40) }).meta({ id: 'ReadBody' });
