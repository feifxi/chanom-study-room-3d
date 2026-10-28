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
    timerMode: t.string().default('none'),
    /** Focus minutes today (Thai time), for the in-room leaderboard. */
    todayMin: t.number().default(0),
    /** True while the player has unsent text in the chat box. */
    typing: t.boolean().default(false),
  },
  'Player',
);
export type Player = SchemaType<typeof Player>;

export const RoomTimer = schema(
  {
    phase: t.string().default('idle'),
    endsAt: t.number().default(0),
    focusMin: t.number().default(25),
    breakMin: t.number().default(5),
    cycle: t.number().default(0),
  },
  'RoomTimer',
);
export type RoomTimer = SchemaType<typeof RoomTimer>;

export const StudyState = schema(
  {
    players: t.map(Player),
    timer: RoomTimer,
  },
  'StudyState',
);
export type StudyState = SchemaType<typeof StudyState>;
