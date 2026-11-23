import {
  INVITE_EXPIRIES,
  JOIN_NOTE_MAX,
  MAP_IDS,
  ROOM_DESCRIPTION_MAX,
  ROOM_LANGUAGES,
  ROOM_NAME_MAX,
  ROOM_ROLES,
  ROOM_RULES_MAX,
  ROOM_SIZES,
  ROOM_TAGS,
  ROOM_TAGS_MAX,
  ROOM_TIMES,
  TIMEOUTS,
  VISIBILITIES,
} from '@connecta/shared';
import { z } from 'zod';
import { LookSchema } from '../accounts/accounts.schemas.js';

const RoomName = z.string().trim().min(1).max(ROOM_NAME_MAX);
const Role = z.enum(ROOM_ROLES);

/** Someone as other people see them: no email, no birthday. */
export const PersonSchema = z
  .object({ id: z.string(), name: z.string(), handle: z.string().nullable(), look: LookSchema.nullable() })
  .meta({ id: 'Person' });
export type Person = z.infer<typeof PersonSchema>;

/** Where you stand with a room. */
export const MyPlaceSchema = z
  .object({
    /** Null when you're not a member */
    role: Role.nullable(),
    pinned: z.boolean(),
    notify: z.enum(['all', 'mentions', 'none']),
    /** You asked to join and are waiting */
    requested: z.boolean(),
    /** Declined: when you can ask again */
    askAgainAt: z.iso.datetime().nullable(),
    /** Let in by a guest pass until then */
    guestUntil: z.iso.datetime().nullable(),
    /** Last opened, for Home's order */
    visitedAt: z.iso.datetime().nullable(),
    /** Can't talk or type until then */
    timedOutUntil: z.iso.datetime().nullable(),
    /** Room chat messages since you last read it (Home and the room's page only) */
    unread: z.number().int(),
    /** One of those mentions you or @room */
    mentioned: z.boolean(),
  })
  .meta({ id: 'MyPlace' });
export type MyPlace = z.infer<typeof MyPlaceSchema>;

/** A room as its members (and, for listed rooms, anyone) see it. */
/** A pass into the room's game server: join `place` with `ticket` (valid a minute). */
export const TicketSchema = z.object({ ticket: z.string(), place: z.string() }).meta({ id: 'Ticket' });
export type Ticket = z.infer<typeof TicketSchema>;

export const RoomSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    emoji: z.string(),
    description: z.string(),
    mapId: z.enum(MAP_IDS),
    size: z.enum(ROOM_SIZES),
    time: z.enum(ROOM_TIMES),
    visibility: z.enum(VISIBILITIES),
    /** Most people inside at once (the owner's setting within the plan and map size) */
    capacity: z.number().int(),
    /** The most the owner could set, from their plan and the map size */
    maxCapacity: z.number().int(),
    tags: z.array(z.string()),
    language: z.string().nullable(),
    rules: z.string(),
    showRules: z.boolean(),
    filterWords: z.boolean(),
    slowMode: z.boolean(),
    newMemberWait: z.boolean(),
    roomWideGames: z.boolean(),
    membersCanInvite: z.boolean(),
    allowGuests: z.boolean(),
    guestVoice: z.boolean(),
    /** The owner has Connecta Plus (the room gets Plus space, Big maps and 1080p shares) */
    ownerPlus: z.boolean(),
    owner: PersonSchema,
    mods: z.array(PersonSchema),
    memberCount: z.number().int(),
    maxMembers: z.number().int(),
    /** Waiting to be let in; only counted for the owner and mods */
    requestCount: z.number().int(),
    /** Who's inside (3D open) right now; members only (empty for everyone else) */
    inside: z.array(PersonSchema),
    me: MyPlaceSchema,
  })
  .meta({ id: 'Room' });
export type Room = z.infer<typeof RoomSchema>;

export const CreateRoomBodySchema = z.object({ name: RoomName, mapId: z.enum(MAP_IDS) }).meta({ id: 'CreateRoomBody' });

/**
 * Room settings. The owner can change everything; mods only the invite and safety settings
 * (they manage people and rules, the room itself is the owner's).
 */
export const RoomSettingsBodySchema = z
  .object({
    name: RoomName,
    emoji: z.string().min(1).max(16),
    description: z.string().trim().max(ROOM_DESCRIPTION_MAX),
    mapId: z.enum(MAP_IDS),
    size: z.enum(ROOM_SIZES),
    time: z.enum(ROOM_TIMES),
    visibility: z.enum(VISIBILITIES),
    capacity: z.number().int().min(2),
    tags: z.array(z.enum(ROOM_TAGS)).max(ROOM_TAGS_MAX),
    language: z.enum(ROOM_LANGUAGES).nullable(),
    rules: z.string().trim().max(ROOM_RULES_MAX),
    showRules: z.boolean(),
    filterWords: z.boolean(),
    slowMode: z.boolean(),
    newMemberWait: z.boolean(),
    roomWideGames: z.boolean(),
    membersCanInvite: z.boolean(),
    allowGuests: z.boolean(),
    guestVoice: z.boolean(),
  })
  .partial()
  .meta({ id: 'RoomSettingsBody' });
export type RoomSettingsBody = z.infer<typeof RoomSettingsBodySchema>;

/** The settings mods may change too. */
export const MOD_SETTINGS = [
  'rules',
  'showRules',
  'filterWords',
  'slowMode',
  'newMemberWait',
  'roomWideGames',
  'membersCanInvite',
  'allowGuests',
  'guestVoice',
] as const satisfies (keyof RoomSettingsBody)[];

export const DeleteRoomBodySchema = z
  .object({ name: z.string().describe('The room name, typed to confirm') })
  .meta({ id: 'DeleteRoomBody' });

export const TransferBodySchema = z.object({ userId: z.string() }).meta({ id: 'TransferBody' });

export const MyPlaceBodySchema = z
  .object({ pinned: z.boolean(), notify: z.enum(['all', 'mentions', 'none']) })
  .partial()
  .meta({ id: 'MyPlaceBody' });

export const MemberSchema = z
  .object({
    person: PersonSchema,
    role: Role,
    joinedAt: z.iso.datetime(),
    timedOutUntil: z.iso.datetime().nullable(),
  })
  .meta({ id: 'Member' });
export type Member = z.infer<typeof MemberSchema>;

export const RoleBodySchema = z.object({ role: z.enum(['mod', 'member']) }).meta({ id: 'RoleBody' });
export const TimeoutBodySchema = z.object({ duration: z.enum(TIMEOUTS) }).meta({ id: 'TimeoutBody' });
export const BanBodySchema = z.object({ reason: z.string().trim().max(200).optional() }).meta({ id: 'BanBody' });

export const BanSchema = z
  .object({ person: PersonSchema, by: PersonSchema.nullable(), reason: z.string().nullable(), at: z.iso.datetime() })
  .meta({ id: 'Ban' });
export type Ban = z.infer<typeof BanSchema>;

export const AskBodySchema = z.object({ note: z.string().trim().max(JOIN_NOTE_MAX).optional() }).meta({ id: 'AskBody' });

export const JoinRequestSchema = z
  .object({ person: PersonSchema, note: z.string().nullable(), at: z.iso.datetime() })
  .meta({ id: 'JoinRequest' });
export type JoinRequestView = z.infer<typeof JoinRequestSchema>;

export const InviteSchema = z
  .object({
    code: z.string(),
    kind: z.enum(['member', 'guest']),
    by: PersonSchema.nullable(),
    expiry: z.enum([...INVITE_EXPIRIES, '24h']),
    uses: z.number().int(),
    /** Null: never */
    expiresAt: z.iso.datetime().nullable(),
  })
  .meta({ id: 'Invite' });
export type InviteView = z.infer<typeof InviteSchema>;

export const MakeInviteBodySchema = z
  .object({
    kind: z.enum(['member', 'guest']),
    /** Member invites only; guest passes are always 24 hours */
    expiry: z.enum(INVITE_EXPIRIES).default('7d'),
    /** Make a new link even if you already have one like it */
    fresh: z.boolean().default(false),
  })
  .meta({ id: 'MakeInviteBody' });

/** What an invite link shows before you use it (anyone can open one). */
export const InvitePreviewSchema = z
  .object({
    code: z.string(),
    kind: z.enum(['member', 'guest']),
    expiresAt: z.iso.datetime().nullable(),
    by: PersonSchema.nullable(),
    room: z.object({
      id: z.string(),
      name: z.string(),
      emoji: z.string(),
      description: z.string(),
      mapId: z.enum(MAP_IDS),
      memberCount: z.number().int(),
      allowGuests: z.boolean(),
    }),
    /** Already a member (open the room) */
    member: z.boolean(),
  })
  .meta({ id: 'InvitePreview' });
export type InvitePreview = z.infer<typeof InvitePreviewSchema>;

export const AcceptedSchema = z.object({ roomId: z.string(), guestUntil: z.iso.datetime().nullable() }).meta({ id: 'Accepted' });

/** A listed room in Discover (and Home's "Open now"). */
export const ListedRoomSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    emoji: z.string(),
    description: z.string(),
    mapId: z.enum(MAP_IDS),
    visibility: z.enum(['request', 'open']),
    tags: z.array(z.string()),
    language: z.string().nullable(),
    owner: PersonSchema,
    memberCount: z.number().int(),
    capacity: z.number().int(),
    rules: z.string().nullable(),
    me: MyPlaceSchema,
  })
  .meta({ id: 'ListedRoom' });
export type ListedRoom = z.infer<typeof ListedRoomSchema>;

export const DiscoverQuerySchema = z
  .object({
    q: z.string().trim().max(64).optional(),
    tag: z.enum(ROOM_TAGS).optional(),
    language: z.enum(ROOM_LANGUAGES).optional(),
  })
  .meta({ id: 'DiscoverQuery' });
