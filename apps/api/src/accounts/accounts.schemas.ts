import { hasBlockedWord } from '@connecta/shared/moderate';
import { ALL_ACCESSORIES, DISPLAY_NAME_MAX, HAIR_COLORS, OUTFIT_COLORS, OUTFIT_STYLES, REQUESTS_FROM } from '@connecta/shared';
import { z } from 'zod';

/** A colour from one of the palettes. Typed as a plain string, like AvatarLook in @connecta/shared. */
const paletteColor = (palette: readonly string[], what: string) =>
  z.string().refine((c) => palette.includes(c), `Not one of the ${what} colours`);

/** The character, limited to the palettes in @connecta/shared. */
export const LookSchema = z
  .object({
    hair: paletteColor(HAIR_COLORS, 'hair'),
    outfit: paletteColor(OUTFIT_COLORS, 'outfit'),
    /** Shop accessories only if you own them (checked when saving) */
    accessory: z.enum(ALL_ACCESSORIES),
    /** The outfit shape; missing = the free sailor top. Shop ones only if you own them */
    style: z.enum(OUTFIT_STYLES).optional(),
  })
  .meta({ id: 'Look' });

// Names are refused rather than masked: a name of asterisks helps nobody (feature 14)
const DisplayName = z
  .string()
  .trim()
  .min(1)
  .max(DISPLAY_NAME_MAX)
  .refine((name) => !hasBlockedWord(name), 'That name has a word we don’t allow');

export const MeSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    /** Null for guests and until sign-up is finished */
    handle: z.string().nullable(),
    look: LookSchema.nullable(),
    /** Null for guests */
    email: z.string().nullable(),
    isGuest: z.boolean(),
    /** Birthday given (13+) */
    ageChecked: z.boolean(),
    /** Birthday, character and @handle are set; the app opens Home */
    signedUp: z.boolean(),
    /** Asked to be deleted: the app only offers "Keep my account" until this time */
    deleteAt: z.iso.datetime().nullable(),
    /** Privacy & safety: who can send you a friend request */
    requestsFrom: z.enum(REQUESTS_FROM),
    /** Friends see you as offline */
    appearOffline: z.boolean(),
    /** Friends see what you're doing, not only where */
    showActivity: z.boolean(),
    /** The time zone your focus days follow (the web app keeps it in step with your browser) */
    timeZone: z.string(),
    /** Listed on the Everyone focus ranking (your choice, or the default: on 18+, off under 18) */
    showOnEveryone: z.boolean(),
    /** No game invite cards while your focus timer runs (Settings → Notifications) */
    hideInvitesWhileFocusing: z.boolean(),
    /** Connecta Plus right now, and until when (null: never had it) */
    plus: z.boolean(),
    plusUntil: z.string().nullable(),
  })
  .meta({ id: 'Me' });
export type Me = z.infer<typeof MeSchema>;

export const BirthdayBodySchema = z.object({ birthday: z.iso.date().describe('YYYY-MM-DD') }).meta({ id: 'BirthdayBody' });

export const SignUpBodySchema = z.object({ name: DisplayName, handle: z.string(), look: LookSchema }).meta({ id: 'SignUpBody' });

export const GuestBodySchema = z.object({ name: DisplayName, look: LookSchema }).meta({ id: 'GuestBody' });

export const HandleCheckSchema = z
  .object({
    handle: z.string(),
    available: z.boolean(),
    /** Why not, when not available */
    reason: z.string().nullable(),
    suggestions: z.array(z.string()),
  })
  .meta({ id: 'HandleCheck' });
export type HandleCheck = z.infer<typeof HandleCheckSchema>;

/** 403 body when the birthday is under 13 or the lock from an earlier try hasn't run out. */
export const TooYoungSchema = z.object({ code: z.literal('too_young'), until: z.iso.datetime() }).meta({ id: 'TooYoung' });

export const ProfileBodySchema = z.object({ name: DisplayName.optional(), look: LookSchema.optional() }).meta({ id: 'ProfileBody' });

export const PrivacyBodySchema = z
  .object({ requestsFrom: z.enum(REQUESTS_FROM), appearOffline: z.boolean(), showActivity: z.boolean(), showOnEveryone: z.boolean() })
  .partial()
  .meta({ id: 'PrivacyBody' });

export const NotificationsBodySchema = z.object({ hideInvitesWhileFocusing: z.boolean() }).partial().meta({ id: 'NotificationsBody' });

export const HandleBodySchema = z.object({ handle: z.string() }).meta({ id: 'HandleBody' });

/** 409 body when the handle was changed less than 30 days ago. */
export const TooSoonSchema = z.object({ code: z.literal('too_soon'), nextChangeAt: z.iso.datetime() }).meta({ id: 'TooSoon' });

/** Settings → Account: private details only the person sees. */
export const AccountDetailsSchema = z
  .object({
    email: z.string(),
    /** YYYY-MM-DD */
    birthday: z.iso.date().nullable(),
    /** Ways to sign in besides an email code (which always works): the linked sign-in's id, for disconnecting */
    linked: z.object({ google: z.string().nullable(), discord: z.string().nullable() }),
    /** Which providers this server has keys for */
    available: z.object({ google: z.boolean(), discord: z.boolean() }),
    /** When the @handle can next be changed; null when it can be now */
    nextHandleChangeAt: z.iso.datetime().nullable(),
  })
  .meta({ id: 'AccountDetails' });
export type AccountDetails = z.infer<typeof AccountDetailsSchema>;

export const DeletionBodySchema = z
  .object({
    handle: z.string().describe('The @handle, typed to confirm'),
    /** Room id → the member who takes it over. Rooms left out go to a mod, else the longest-standing member */
    heirs: z.record(z.string(), z.string()).default({}),
  })
  .meta({ id: 'DeletionBody' });
