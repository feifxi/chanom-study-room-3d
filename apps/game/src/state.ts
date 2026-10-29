import { schema, t, type SchemaType } from '@colyseus/schema';

export const Player = schema(
  {
    name: t.string(),
    /** JSON-encoded AvatarLook; validated on join. */
    look: t.string(),
    x: t.float32(),
    z: t.float32(),
    yaw: t.float32(),
    moving: t.boolean(),
    /** Seat id from the shared layout, or '' when standing. */
    seatId: t.string().default(''),
    status: t.string().default('idle'),
    statusEndsAt: t.number().default(0),
    subject: t.string().default(''),
    /** Server epoch ms when the current focus stretch began (0 when not focusing). */
    focusSince: t.number().default(0),
    /** Focus minutes today (Thai time), for the in-room leaderboard. */
    todayMin: t.number().default(0),
    /** True while the player has unsent text in the chat box. */
    typing: t.boolean().default(false),
    /** Last move message applied (its client sequence number), so the client can reconcile its prediction */
    moveSeq: t.number().default(0),
  },
  'Player',
);
export type Player = SchemaType<typeof Player>;

/** A room NPC (cat or study buddy), driven by the server's NpcDirector. */
export const Npc = schema(
  {
    kind: t.string(),
    name: t.string(),
    /** JSON: { coat } for cats, an AvatarLook for buddies */
    look: t.string(),
    x: t.float32(),
    z: t.float32(),
    y: t.float32().default(0),
    yaw: t.float32(),
    moving: t.boolean(),
    anim: t.string().default('idle'),
    seatId: t.string().default(''),
    status: t.string().default('idle'),
    statusEndsAt: t.number().default(0),
    focusSince: t.number().default(0),
    subject: t.string().default(''),
    /** Session id of the person a cat is following ('' = nobody). */
    following: t.string().default(''),
  },
  'Npc',
);
export type Npc = SchemaType<typeof Npc>;

export const StudyState = schema(
  {
    players: t.map(Player),
    npcs: t.map(Npc),
  },
  'StudyState',
);
export type StudyState = SchemaType<typeof StudyState>;
