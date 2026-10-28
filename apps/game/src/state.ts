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
  },
  'Player',
);
export type Player = SchemaType<typeof Player>;

export const StudyState = schema(
  {
    players: t.map(Player),
  },
  'StudyState',
);
export type StudyState = SchemaType<typeof StudyState>;
