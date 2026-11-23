import { schema, t, type SchemaType } from '@colyseus/schema';

/** One person in the room (PlayerView in packages/shared is how clients read it). */
export const Player = schema(
  {
    userId: t.string(),
    handle: t.string().default(''),
    role: t.string(),
    name: t.string(),
    /** JSON-encoded AvatarLook */
    look: t.string(),
    x: t.float32(),
    z: t.float32(),
    yaw: t.float32(),
    moving: t.boolean(),
    /** Seat id from the map, or '' when standing */
    seatId: t.string().default(''),
    status: t.string().default('idle'),
    focusPreset: t.uint8().default(0),
    statusEndsAt: t.number().default(0),
    subject: t.string().default(''),
    focusSince: t.number().default(0),
    todayMin: t.number().default(0),
    typing: t.boolean().default(false),
    /** Talk to everyone (owner and mods) */
    stage: t.boolean().default(false),
    /** Can't use voice right now (a guest without guest voice, muted for everyone, timed out) */
    hushed: t.boolean().default(false),
    /** Muted for everyone by the owner or a mod */
    mutedByMod: t.boolean().default(false),
    deaf: t.boolean().default(false),
    /** Sharing their screen: 'tv', 'table:<tableId>', or '' */
    share: t.string().default(''),
    shareAudio: t.boolean().default(false),
    /** In photo mode: others see 📸 by their name, so they can pose */
    photo: t.boolean().default(false),
    /** The last move applied (its client sequence number), so the client can reconcile its prediction */
    moveSeq: t.number().default(0),
  },
  'Player',
);
export type Player = SchemaType<typeof Player>;

/** A cat or study buddy (part 5 of step 4 brings them to life; the map is empty of them until then). */
export const Npc = schema(
  {
    kind: t.string(),
    name: t.string(),
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
    following: t.string().default(''),
  },
  'Npc',
);
export type Npc = SchemaType<typeof Npc>;

/** A video on the big screen or in Up next (WatchVideo in packages/shared) */
export const Video = schema(
  {
    key: t.string(),
    videoId: t.string(),
    title: t.string(),
    by: t.string(),
    byName: t.string(),
  },
  'Video',
);
export type Video = SchemaType<typeof Video>;

/** Watch together's screen (WatchView in packages/shared): what's on, the shared timeline, Up next */
export const Watch = schema(
  {
    key: t.string().default(''),
    videoId: t.string().default(''),
    title: t.string().default(''),
    by: t.string().default(''),
    byName: t.string().default(''),
    offset: t.number().default(0),
    startedAt: t.number().default(0),
    paused: t.boolean().default(false),
    queue: t.array(Video),
  },
  'Watch',
);
export type Watch = SchemaType<typeof Watch>;

export const RoomState = schema(
  {
    /** The room's map; changing it (Room settings) moves everyone to the new map's door */
    mapId: t.string(),
    players: t.map(Player),
    npcs: t.map(Npc),
    watch: t.ref(Watch),
  },
  'RoomState',
);
export type RoomState = SchemaType<typeof RoomState>;
