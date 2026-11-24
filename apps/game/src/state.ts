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
    /** Has Connecta Plus: an animated name tag */
    plus: t.boolean().default(false),
    /** On the Connecta team: a chip by their name (only Common rooms' tickets say so) */
    team: t.boolean().default(false),
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

/** A cat or study buddy (the Buddy Machine's, or the room's own cats). */
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
    /** A pet's owner (user id) and name: only they send it home */
    owner: t.string().default(''),
    ownerName: t.string().default(''),
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

/** An activity spot's round (SpotView in packages/shared): the framework's state, whatever the game */
export const Spot = schema(
  {
    phase: t.string().default('free'),
    gameId: t.string().default(''),
    hostId: t.string().default(''),
    players: t.array('string'),
    nextRound: t.array('string'),
    out: t.array('string'),
    awaySince: t.map('number'),
    startsAt: t.number().default(0),
    inviteBy: t.string().default(''),
    inviteAt: t.number().default(0),
    results: t.array('string'),
    resultsUntil: t.number().default(0),
  },
  'Spot',
);
export type Spot = SchemaType<typeof Spot>;

/** The chess table's game (ChessView in packages/shared), copied from the rules' state after each change */
export const Chess = schema(
  {
    white: t.string().default(''),
    black: t.string().default(''),
    moves: t.array('string'),
    fen: t.string().default(''),
    lastFrom: t.string().default(''),
    lastTo: t.string().default(''),
    takenW: t.array('string'),
    takenB: t.array('string'),
    drawOffer: t.string().default(''),
    endWinner: t.string().default(''),
    endWhy: t.string().default(''),
    rev: t.number().default(0),
  },
  'Chess',
);
export type Chess = SchemaType<typeof Chess>;

/** One pair in Slave's swap: the King (or Queen) gives `count` cards back to `to` */
export const SlaveSwap = schema(
  {
    giver: t.string().default(''),
    to: t.string().default(''),
    count: t.number().default(0),
  },
  'SlaveSwap',
);

/** Slave at the card table (SlaveView in packages/shared): the public part only, never a hand */
export const Slave = schema(
  {
    stage: t.string().default(''),
    players: t.array('string'),
    counts: t.map('number'),
    pileBy: t.string().default(''),
    pileCards: t.array('number'),
    passed: t.array('string'),
    turn: t.string().default(''),
    until: t.number().default(0),
    finished: t.array('string'),
    gone: t.array('string'),
    titles: t.map('string'),
    swap: t.array(SlaveSwap),
    rev: t.number().default(0),
  },
  'Slave',
);
export type Slave = SchemaType<typeof Slave>;

/**
 * Pick a Side on the open floor (SideView in packages/shared). Only the question being asked is
 * here, and its right answer only at the reveal, so nobody can read ahead.
 */
export const Side = schema(
  {
    /** The deck the host picked (shown in the lobby too) */
    deckId: t.string().default(''),
    deckName: t.string().default(''),
    deckEmoji: t.string().default(''),
    deckCount: t.number().default(0),
    /** '' when there's no game; ask, reveal or done */
    stage: t.string().default(''),
    mode: t.string().default(''),
    i: t.number().default(0),
    count: t.number().default(0),
    until: t.number().default(0),
    q: t.string().default(''),
    choices: t.array('string'),
    /** The right answer at a quiz's reveal; -1 otherwise */
    right: t.number().default(-1),
    /** Where each player stood when the timer ended (-1: in no zone); empty while asking */
    answers: t.map('number'),
    scores: t.map('number'),
    /** Each player's answers so far ("0,1,-,0"), so everyone can see who picked like them */
    picks: t.map('string'),
    winners: t.array('string'),
    solo: t.boolean().default(false),
    rev: t.number().default(0),
  },
  'Side',
);
export type Side = SchemaType<typeof Side>;

/**
 * Draw & Guess at the art corner (TelView in packages/shared): the flow only. Entries never ride in
 * the state: each player gets what they work from (`tel:turn`), and the chains go out at the album.
 */
export const Tel = schema(
  {
    /** '' when there's no game; turn, reveal or done */
    stage: t.string().default(''),
    mode: t.string().default(''),
    order: t.array('string'),
    steps: t.number().default(0),
    step: t.number().default(0),
    until: t.number().default(0),
    lookUntil: t.number().default(0),
    /** Who has sent this step */
    sent: t.array('string'),
    revealChain: t.number().default(0),
    revealShown: t.number().default(0),
    revealPaused: t.boolean().default(false),
    /** `chain:entry:emoji` → how many */
    reactions: t.map('number'),
    rev: t.number().default(0),
  },
  'Tel',
);
export type Tel = SchemaType<typeof Tel>;

export const RoomState = schema(
  {
    /** The room's map; changing it (Room settings) moves everyone to the new map's door */
    mapId: t.string(),
    players: t.map(Player),
    npcs: t.map(Npc),
    watch: t.ref(Watch),
    /** The activity spots and their rounds (docs/features/08-activities.md) */
    spots: t.map(Spot),
    chess: t.ref(Chess),
    slave: t.ref(Slave),
    side: t.ref(Side),
    tel: t.ref(Tel),
    /** The Connecta team's notice in Common rooms ('' for none), shown until noticeUntil (ms) */
    notice: t.string(),
    noticeUntil: t.number(),
  },
  'RoomState',
);
export type RoomState = SchemaType<typeof RoomState>;
