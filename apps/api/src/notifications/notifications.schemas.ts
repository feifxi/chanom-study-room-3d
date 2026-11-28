import { z } from 'zod';
import { PersonSchema } from '../rooms/rooms.schemas.js';

export const NOTIFICATION_KINDS = [
  'friend_request',
  'friend_accepted',
  'join_request',
  'joined',
  'mention',
  'messages',
  'gift',
  'plus',
] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

/** One item in the 🔔 inbox. */
export const NotificationSchema = z
  .object({
    id: z.string(),
    kind: z.enum(NOTIFICATION_KINDS),
    /** What it says; **bold** marks names */
    text: z.string(),
    /** What opening it shows */
    href: z.string(),
    /** Who it's about, shown as their face (otherwise the kind's icon) */
    person: PersonSchema.nullable(),
    at: z.iso.datetime(),
    unread: z.boolean(),
  })
  .meta({ id: 'Notification' });
export type NotificationView = z.infer<typeof NotificationSchema>;

export const InboxSchema = z.object({ items: z.array(NotificationSchema), unread: z.number().int() }).meta({ id: 'Inbox' });
export type Inbox = z.infer<typeof InboxSchema>;

export const ReadNotificationsBodySchema = z
  .object({
    /** These items; leave out for "Mark all read" */
    ids: z.array(z.string().max(40)).max(100).optional(),
  })
  .meta({ id: 'ReadNotificationsBody' });
