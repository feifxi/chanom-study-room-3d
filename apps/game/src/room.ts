import { Room, ServerError, validate, type Client } from 'colyseus';
import { z } from 'zod';
import {
  BUBBLE_MAX,
  DEFAULT_LOOK,
  GAME_CLOSE,
  MIN_COUNTED_FOCUS_MIN,
  LOOK_EVERY_MS,
  PATCH_RATE_MS,
  RECONNECT_SECONDS,
  SAY_COOLDOWN_MS,
  SIT_REACH,
  SUBJECT_MAX,
  TYPING_TIMEOUT_MS,
  NPC_KINDS,
  sanitizeLook,
  type NpcNote,
  type NpcReact,
  type NpcRefused,
  type NpcSummoned,
  type Quiet,
  type Said,
  type FocusPreset,
  type GameJoinOptions,
  type GameRoomEvent,
  type GameTicket,
  type GameWalkedIn,
  type PlayerRole,
  type WatchRefused,
  parseYouTube,
  BOARD_ADD_MAX,
  type BoardAdd,
} from '@connecta/shared';
import { inArea, mapDataFor, zoneAtIn, type MapData } from '@connecta/shared/maps';
import { idleTimer, startFocus, stopTimer, tickTimer, type EndedRound, type FocusTimer } from './focus.js';
import { links, liveRooms } from './links.js';
import { log } from './log.js';
import { NpcDirector } from './npc/director.js';
import { Player, RoomState } from './state.js';
import { clamp, refillMoveBudget, spendMove } from './rules.js';
import { readDeckPass, readTicket } from './ticket.js';
import { voice } from './voice.js';
import { Tv, youtube } from './watch.js';
import { Activities, ChessTable } from './activity.js';
import { SlaveTable } from './slave.js';
import { Board } from './board.js';
import { SideFloor } from './pickASide.js';

/** A Slave play: 1–4 cards, each 0–51 */
const CARDS = z.array(z.number().int().min(0).max(51)).min(1).max(4);

/** Set by the entry point from GAME_SECRET. */
export const secrets = { ticket: '' };

/** Matchmaking keeps rooms apart by `place`, the Connecta room id (see GameJoinOptions). */
type JoinOptions = GameJoinOptions;

/** The cats and study buddies move ten times a second */
const NPC_TICK_MS = 100;
/** Focus timers run out to within this */
const TIMER_TICK_MS = 250;

/** Owners and mods always fit (spec 01: "the owner and mods always fit"), so the hard cap sits well above capacity. */
const HARD_CAP = 250;

const finite = z.number().refine(Number.isFinite);

/** Server-only bookkeeping per connection (not synced). */
interface Private {
  userId: string;
  lastMoveAt: number;
  /** Metres of movement allowed right now (see refillMoveBudget) */
  moveBudget: number;
  lastSaidAt: number;
  typingAt: number;
  lookAt: number;
  /** Timed out until then (epoch ms): no bubbles, no typing */
  quietUntil: number;
  /** No input for 10 minutes (the client decides; a running focus round still shows as focus) */
  away: boolean;
  /** The focus timer, run here so the minutes are real */
  timer: FocusTimer;
}

type Auth = GameTicket;

/**
 * A Connecta room in 3D (build step 4, docs/v2/features/06-3d-room.md). Who may come in is decided by
 * the API, which signs a join ticket; this checks the ticket, the capacity, and the movement rules.
 */
export class ConnectaRoom extends Room<{ state: RoomState }> {
  maxClients = HARD_CAP;
  patchRate = PATCH_RATE_MS;
  autoDispose = true;
  state = new RoomState();

  private connectaId = '';
  private capacity = 0;
  private map: MapData = mapDataFor('library');
  private priv = new Map<string, Private>();
  private clients_ = new Map<string, Client>();
  /** Full when someone was turned away; the next leave tells the waiting list */
  private turnedAway = false;
  /** Room settings → Guests can use voice (the newest ticket, then live changes) */
  private guestVoice = false;
  /** Room settings → Room-wide games (from the ticket, then live) */
  private roomWideGames = true;
  /** Muted for everyone, by account, so walking out and back in doesn't lift it; gone when the room empties */
  private muted = new Set<string>();
  /** The cats and study buddies (part 5): in memory, so they reset when the room empties */
  private npc = this.makeNpcs();
  /** Focus minutes finished here since the room opened, by account (guests too): "This room today" adds the saved ones */
  private focusDone = new Map<string, number>();
  /** Watch together's big screen (feature 10): in memory, gone when the room empties */
  private tv = new Tv(this.state.watch);
  /** The activity spots this server runs (feature 9): the table games so far */
  private chess = new ChessTable(this.state.chess);
  private slave = new SlaveTable(this.state.slave, {
    seatIndex: (sessionId) => {
      const seats = SlaveTable.spot.seats(this.map) ?? [];
      return seats.indexOf(this.state.players.get(sessionId)?.seatId ?? '');
    },
    send: (sessionId, type, message) => this.clients_.get(sessionId)?.send(type, message),
  });
  private side = this.makeSide();
  private activities = this.makeActivities();
  /** The whiteboard (feature 11): strokes relayed apart from the state, kept with the room */
  private board = new Board((id) => this.broadcast('board:undo', { id }));

  messages = {
    move: validate(
      z.object({ x: finite, z: finite, yaw: finite, moving: z.boolean(), seq: z.number().int().nonnegative().optional() }),
      (client, msg) => {
        const p = this.state.players.get(client.sessionId);
        const s = this.priv.get(client.sessionId);
        if (!p || !s) return;
        if (p.seatId) p.seatId = ''; // moving stands you up

        const now = Date.now();
        s.moveBudget = refillMoveBudget(s.moveBudget, (now - s.lastMoveAt) / 1000);
        s.lastMoveAt = now;
        const next = spendMove(p, msg, s.moveBudget, this.map.bounds);
        s.moveBudget = next.budget;
        p.x = next.x;
        p.z = next.z;
        if (msg.seq !== undefined) p.moveSeq = msg.seq;
        p.yaw = msg.yaw;
        p.moving = msg.moving;
        this.checkShare(p);
      },
    ),

    sit: validate(z.object({ seatId: z.string().max(40) }), (client, msg) => {
      const p = this.state.players.get(client.sessionId);
      const seat = this.map.seatById.get(msg.seatId);
      if (!p || !seat) return;
      if (Math.hypot(seat.x - p.x, seat.z - p.z) > SIT_REACH) return;
      for (const other of this.state.players.values()) if (other !== p && other.seatId === seat.id) return; // taken
      // A study buddy there gives the seat up for a person
      this.npc.yieldSeat(seat.id);
      p.seatId = seat.id;
      p.x = seat.x;
      p.z = seat.z;
      p.yaw = seat.yaw;
      p.moving = false;
      this.checkShare(p);
    }),

    stand: (client: Client) => {
      const p = this.state.players.get(client.sessionId);
      if (p?.seatId) this.standUp(p);
      if (p) this.checkShare(p);
    },

    /**
     * A screen share (feature 10): on the TV while you stand on its rug, or to your table while you
     * sit at a desk. One at a time in each place; it ends when you leave it. The picture and sound go
     * over LiveKit; each sharer's client lets only this audience receive them.
     */
    share: validate(z.object({ where: z.enum(['tv', 'table', '']), audio: z.boolean() }), (client, msg) => {
      const p = this.state.players.get(client.sessionId);
      if (!p) return;
      if (!msg.where) return void Object.assign(p, { share: '', shareAudio: false });
      if (p.hushed) return;
      const seat = this.map.seatById.get(p.seatId);
      const where =
        msg.where === 'tv' ? (inArea(this.map.tvArea, p.x, p.z) ? 'tv' : '') : seat && seat.kind !== 'sofa' ? `table:${seat.tableId}` : '';
      if (!where) return;
      for (const other of this.state.players.values()) if (other !== p && other.share === where) return; // someone's on
      p.share = where;
      p.shareAudio = msg.audio;
    }),

    /**
     * Watch together (feature 10): anyone on the TV's rug, guests too, puts videos on and controls
     * them; owners and mods can turn the screen off from anywhere. Skip and "ended" name the video
     * they mean, so two people at once move Up next on by one.
     */
    'watch:add': validate(z.object({ link: z.string().max(300) }), (client, msg) => void this.addVideo(client, msg.link)),
    'watch:pause': validate(z.object({ paused: z.boolean() }), (client, msg) => {
      if (this.atTv(client)) this.tv.pause(msg.paused, Date.now());
    }),
    'watch:seek': validate(z.object({ seconds: finite }), (client, msg) => {
      if (this.atTv(client)) this.tv.seek(msg.seconds, Date.now());
    }),
    'watch:next': validate(z.object({ key: z.string() }), (client, msg) => {
      if (this.atTv(client)) this.tv.next(msg.key, Date.now());
    }),
    'watch:remove': validate(z.object({ key: z.string() }), (client, msg) => {
      if (this.atTv(client)) this.tv.remove(msg.key);
    }),
    'watch:off': (client: Client) => {
      const p = this.state.players.get(client.sessionId);
      if (p && (p.role === 'owner' || p.role === 'mod')) this.tv.off();
    },

    /**
     * The activity framework (feature 9): the host starts, ends and calls everyone; anyone leaves.
     * Joining is sitting down (or standing on a spot's rug), so it needs no message.
     */
    'activity:begin': (client: Client) => this.activities.begin(client.sessionId, Date.now()),
    'activity:end': (client: Client) => this.activities.end(client.sessionId),
    'activity:call': (client: Client) => this.activities.call(client.sessionId, Date.now()),
    'activity:leave': (client: Client) => this.activities.leave(client.sessionId),

    /** Chess (feature 12): every move is checked with the shared rules */
    'chess:move': validate(
      z.object({ from: z.string().max(2), to: z.string().max(2), promotion: z.enum(['q', 'r', 'b', 'n']).optional() }),
      (client, msg) => this.chess.move(client.sessionId, msg.from, msg.to, msg.promotion),
    ),
    'chess:resign': (client: Client) => this.chess.resign(client.sessionId),
    'chess:draw:offer': (client: Client) => this.chess.offerDraw(client.sessionId),
    'chess:draw:answer': validate(z.object({ accept: z.boolean() }), (client, msg) => this.chess.answerDraw(client.sessionId, msg.accept)),
    // The whiteboard: whoever stands in front of it draws (guests too); a time-out stops that too
    'board:start': validate(
      z.object({ n: z.number().int().min(0), color: z.string().max(16), size: z.number(), pts: z.array(z.number()).max(BOARD_ADD_MAX) }),
      (client, msg) => {
        const who = this.atBoard(client.sessionId);
        const stroke = who && this.board.start(client.sessionId, who.userId, msg.n, msg.color, msg.size, msg.pts);
        if (stroke) this.broadcast('board:start', stroke, { except: client });
        // Refused (timed out, walked off, a bad pen): the drawer's screen takes it back too
        else client.send('board:undo', { id: `${client.sessionId}:${msg.n}` });
      },
    ),
    'board:add': validate(z.object({ n: z.number().int().min(0), pts: z.array(z.number()).max(BOARD_ADD_MAX) }), (client, msg) => {
      if (!this.atBoard(client.sessionId)) return;
      const add = this.board.add(client.sessionId, msg.n, msg.pts);
      if (add) this.broadcast('board:add', add satisfies BoardAdd, { except: client });
    }),
    'board:undo': (client: Client) => {
      const who = this.atBoard(client.sessionId);
      const id = who && this.board.undo(who.userId);
      if (id) this.broadcast('board:undo', { id });
    },
    'board:clear': (client: Client) => {
      if (this.atBoard(client.sessionId) && this.board.clear()) this.broadcast('board:clear');
    },
    'board:sync': (client: Client) => client.send('board:all', { strokes: this.board.all() }),
    // The round flow at a standing spot: E opens a lobby; the host picks the game (Pick a Side's mode)
    'activity:start': validate(z.object({ spot: z.string().max(20) }), (client, msg) =>
      this.activities.open(client.sessionId, msg.spot, Date.now()),
    ),
    'activity:game': validate(z.object({ gameId: z.string().max(20) }), (client, msg) => {
      if (this.activities.pick(client.sessionId, msg.gameId) && this.activities.hostOf(client.sessionId) === 'floor')
        this.side.modeChanged(msg.gameId);
    }),
    // Pick a Side's deck: the host's, in the lobby. A room deck comes as the API's signed pass
    'side:deck': validate(
      z.union([z.object({ builtIn: z.string().max(40) }), z.object({ pass: z.string().max(60_000) })]),
      async (client, msg) => {
        if (this.activities.hostOf(client.sessionId) !== 'floor') return;
        if ('builtIn' in msg) return this.side.pickBuiltIn(msg.builtIn);
        const pass = await readDeckPass(msg.pass, secrets.ticket);
        if (pass?.roomId === this.connectaId && this.activities.hostOf(client.sessionId) === 'floor') this.side.pickRoomDeck(pass.deck);
      },
    ),
    'slave:play': validate(z.object({ cards: CARDS }), (client, msg) => this.slave.play(client.sessionId, msg.cards)),
    'slave:pass': (client: Client) => this.slave.pass(client.sessionId),
    // The page is listening: your cards again (after a reload mid-game they were sent before it was)
    'slave:hand': (client: Client) => this.slave.joined(client.sessionId),
    'slave:giveBack': validate(z.object({ cards: CARDS }), (client, msg) => this.slave.giveBack(client.sessionId, msg.cards)),

    /** Photo mode (feature 10): 📸 by your name while it's open, so people can pose */
    photo: validate(z.object({ on: z.boolean() }), (client, msg) => {
      const p = this.state.players.get(client.sessionId);
      if (p) p.photo = msg.on;
    }),

    /** A bubble: to the whole room, or only to the private zone you're standing in */
    say: validate(z.object({ text: z.string() }), (client, msg) => {
      const p = this.state.players.get(client.sessionId);
      const s = this.priv.get(client.sessionId);
      const text = msg.text.trim().slice(0, BUBBLE_MAX);
      if (!p || !s || !text) return;
      const now = Date.now();
      if (s.quietUntil > now) return void client.send('quiet', { until: s.quietUntil } satisfies Quiet);
      if (now - s.lastSaidAt < SAY_COOLDOWN_MS) return;
      s.lastSaidAt = now;
      p.typing = false;
      const said: Said = { id: client.sessionId, text };
      // Talk to everyone reaches into private zones too
      const zone = p.stage ? undefined : zoneAtIn(this.map, p.x, p.z);
      if (!zone) return void this.broadcast('said', said);
      for (const [sessionId, c] of this.clients_) {
        const o = this.state.players.get(sessionId);
        if (o && zoneAtIn(this.map, o.x, o.z)?.id === zone.id) c.send('said', said);
      }
    }),

    typing: validate(z.object({ typing: z.boolean() }), (client, msg) => {
      const p = this.state.players.get(client.sessionId);
      const s = this.priv.get(client.sessionId);
      if (!p || !s || (msg.typing && s.quietUntil > Date.now())) return;
      p.typing = msg.typing;
      s.typingAt = Date.now();
    }),

    /** No input for 10 minutes (the client decides): 💤 and the mic off, unless a focus round is running */
    away: validate(z.object({ on: z.boolean() }), (client, msg) => {
      const p = this.state.players.get(client.sessionId);
      const s = this.priv.get(client.sessionId);
      if (!p || !s) return;
      s.away = msg.on;
      this.showStatus(p, s);
      if (p.status === 'away') {
        p.stage = false;
        // A forgotten tab shouldn't broadcast the room: the mic goes off in LiveKit too
        voice.current?.muteMic(this.connectaId, client.sessionId);
      }
    }),

    /**
     * The focus timer (feature 8): personal, 25/5 or 50/10, each round started by a press. One timer
     * per account follows from one room at a time.
     */
    'focus:start': validate(z.object({ preset: z.union([z.literal(0), z.literal(1)]), subject: z.string().optional() }), (client, msg) => {
      const p = this.state.players.get(client.sessionId);
      const s = this.priv.get(client.sessionId);
      if (!p || !s || s.timer.phase === 'focus') return;
      if (msg.subject !== undefined) p.subject = cleanSubject(msg.subject);
      s.timer = startFocus(msg.preset as FocusPreset, Date.now());
      this.showStatus(p, s);
      this.tellPresence(client.sessionId);
    }),

    'focus:stop': (client: Client) => this.stopFocus(client.sessionId),

    /** What you're studying, shown with 📖 by your name (and to friends, if they may see it) */
    'focus:subject': validate(z.object({ subject: z.string() }), (client, msg) => {
      const p = this.state.players.get(client.sessionId);
      const s = this.priv.get(client.sessionId);
      if (!p || !s) return;
      const subject = cleanSubject(msg.subject);
      if (subject === p.subject) return;
      p.subject = subject;
      if (s.timer.phase === 'focus') this.tellPresence(client.sessionId);
    }),

    /** A pass to the room's voice, listening only when you can't talk */
    voice: async (client: Client) => {
      const p = this.state.players.get(client.sessionId);
      if (!p || !voice.current) return;
      client.send('voice', await voice.current.pass(this.connectaId, client.sessionId, p.name, !p.hushed));
    },

    /** Deafened: shown by your name (hearing nobody is up to your own client) */
    deaf: validate(z.object({ on: z.boolean() }), (client, msg) => {
      const p = this.state.players.get(client.sessionId);
      if (p) p.deaf = msg.on;
    }),

    /** Mute for everyone: the owner on anyone, a mod on members and guests; lasts until lifted or the room empties */
    mute: validate(z.object({ id: z.string().max(64), on: z.boolean() }), (client, msg) => {
      const actor = this.state.players.get(client.sessionId);
      const target = this.state.players.get(msg.id);
      if (!actor || !target || target === actor) return;
      const canAct =
        actor.role === 'owner'
          ? target.role !== 'owner'
          : actor.role === 'mod'
            ? target.role === 'member' || target.role === 'guest'
            : false;
      if (!canAct) return;
      if (msg.on) this.muted.add(target.userId);
      else this.muted.delete(target.userId);
      for (const sessionId of this.sessionsOf(target.userId)) this.refreshVoice(sessionId);
      log.info({ roomId: this.connectaId, by: actor.userId, userId: target.userId, on: msg.on }, 'muted for everyone');
    }),

    /** Talk to everyone: the owner and mods only */
    stage: validate(z.object({ on: z.boolean() }), (client, msg) => {
      const p = this.state.players.get(client.sessionId);
      if (!p) return;
      p.stage = msg.on && (p.role === 'owner' || p.role === 'mod') && p.status !== 'away' && !p.hushed;
    }),

    /** The Buddy Machine: summon a cat or a study buddy for everyone (anyone can, guests too) */
    'npc:summon': validate(z.object({ kind: z.enum(NPC_KINDS) }), (client, msg) => {
      const p = this.state.players.get(client.sessionId);
      if (!p) return;
      const refused = this.npc.summon(client.sessionId, p, msg.kind);
      if (refused) client.send('npc:refused', { reason: refused } satisfies NpcRefused);
    }),

    /** Send one home: nobody owns them, so anyone can */
    'npc:goodbye': validate(z.object({ id: z.string().max(40) }), (client, msg) => {
      const p = this.state.players.get(client.sessionId);
      if (p) this.npc.goodbye(msg.id, p.name);
    }),

    /** Head pats for a cat within reach */
    'npc:pet': validate(z.object({ id: z.string().max(40) }), (client, msg) => {
      const p = this.state.players.get(client.sessionId);
      if (p) this.npc.pet(client.sessionId, p, msg.id);
    }),

    /** A new look from Settings → My character, live for everyone (guests keep the one they picked) */
    look: validate(z.object({ look: z.unknown() }), (client, msg) => {
      const p = this.state.players.get(client.sessionId);
      const s = this.priv.get(client.sessionId);
      const now = Date.now();
      if (!p || !s || p.role === 'guest' || now - s.lookAt < LOOK_EVERY_MS) return;
      s.lookAt = now;
      p.look = JSON.stringify(sanitizeLook(msg.look));
    }),
  };

  /** The ticket is the only proof of who you are; its room must be this room. */
  async onAuth(_client: Client, options: Partial<JoinOptions>): Promise<Auth> {
    const ticket = await readTicket(options.ticket, secrets.ticket);
    if (!ticket || ticket.roomId !== options.place) throw new ServerError(401, 'unauthorized');
    if (this.connectaId && ticket.roomId !== this.connectaId) throw new ServerError(401, 'unauthorized');
    // A newer ticket carries the latest capacity and guest voice (the owner changed Room settings)
    this.capacity = ticket.capacity;
    this.guestVoice = ticket.guestVoice ?? false;
    this.roomWideGames = ticket.roomWideGames ?? true;
    const staff = ticket.role === 'owner' || ticket.role === 'mod';
    const others = [...this.priv.values()].filter((s) => s.userId !== ticket.sub).length;
    if (!staff && others >= this.capacity) {
      this.turnedAway = true;
      throw new ServerError(403, 'full');
    }
    return ticket;
  }

  onCreate(options: JoinOptions) {
    this.connectaId = options.place;
    liveRooms.set(this.connectaId, this);
    // Presence expires unless refreshed (the gateway's STALE_MS), so say who's still here every minute
    this.clock.setInterval(() => {
      for (const sessionId of this.priv.keys()) this.tellPresence(sessionId);
    }, 60_000);
    // Typing dots from a tab that went quiet, and voice back when a time out ends
    this.clock.setInterval(() => {
      const now = Date.now();
      for (const [sessionId, s] of this.priv) {
        const p = this.state.players.get(sessionId);
        if (p?.typing && now - s.typingAt > TYPING_TIMEOUT_MS) p.typing = false;
        if (p?.hushed) this.refreshVoice(sessionId);
      }
    }, 1000);
    this.clock.setInterval(() => this.npc.tick(NPC_TICK_MS / 1000), NPC_TICK_MS);
    this.clock.setInterval(() => this.tickTimers(), TIMER_TICK_MS);
    this.clock.setInterval(() => this.tickTv(), TIMER_TICK_MS);
    this.clock.setInterval(() => this.activities.tick(Date.now()), TIMER_TICK_MS);
  }

  onJoin(client: Client, _options: JoinOptions, ticket: Auth) {
    if (!this.state.mapId) this.setMap(ticket.mapId);
    // One of you per room: the newest tab wins, the old one is told why it closed. A running timer
    // comes along, so a reload (the old connection still waiting to reconnect) keeps your round
    let carried: { timer: FocusTimer; subject: string } | null = null;
    for (const [sessionId, s] of this.priv) {
      if (s.userId !== ticket.sub) continue;
      const old = this.clients_.get(sessionId);
      if (s.timer.phase !== 'idle') carried = { timer: s.timer, subject: this.state.players.get(sessionId)?.subject ?? '' };
      s.timer = idleTimer();
      // …and so does your place in a game
      this.activities.renamed(sessionId, client.sessionId, Date.now());
      this.remove(sessionId);
      old?.leave(GAME_CLOSE.elsewhere);
    }
    const spot = this.doorSpot();
    this.state.players.set(
      client.sessionId,
      new Player({
        userId: ticket.sub,
        handle: ticket.handle ?? '',
        role: ticket.role,
        name: ticket.name,
        look: JSON.stringify(ticket.look ?? DEFAULT_LOOK),
        x: spot.x,
        z: spot.z,
        yaw: Math.PI,
        moving: false,
        subject: carried?.subject ?? '',
        todayMin: this.focusDone.get(ticket.sub) ?? 0,
      }),
    );
    this.priv.set(client.sessionId, {
      userId: ticket.sub,
      lastMoveAt: Date.now(),
      moveBudget: 0,
      lastSaidAt: 0,
      typingAt: 0,
      lookAt: 0,
      quietUntil: ticket.timedOutUntil ?? 0,
      away: false,
      timer: carried?.timer ?? idleTimer(),
    });
    this.showStatus(this.state.players.get(client.sessionId)!, this.priv.get(client.sessionId)!);
    this.clients_.set(client.sessionId, client);
    for (const sessionId of this.priv.keys()) this.refreshVoice(sessionId);
    this.npc.joined(this.state.players.get(client.sessionId)!, (fn, ms) => this.clock.setTimeout(fn, ms));
    this.tellPresence(client.sessionId);
    // Any other room you're in lets you go
    links.walkedIn({ userId: ticket.sub, roomId: this.connectaId });
    log.info({ roomId: this.connectaId, userId: ticket.sub, role: ticket.role }, 'walked in');
  }

  /** A dropped connection keeps your place briefly, so a flaky network can resume. */
  async onDrop(client: Client) {
    try {
      await this.allowReconnection(client, RECONNECT_SECONDS);
    } catch {
      // Never came back: onLeave tidies up
    }
  }

  onReconnect(client: Client) {
    // Replaced by a newer tab while away
    if (!this.priv.has(client.sessionId)) return void client.leave(GAME_CLOSE.elsewhere);
    this.clients_.set(client.sessionId, client);
    this.slave.joined(client.sessionId);
  }

  onLeave(client: Client) {
    this.remove(client.sessionId);
  }

  onDispose() {
    if (liveRooms.get(this.connectaId) === this) liveRooms.delete(this.connectaId);
  }

  /** Something changed in the API (kick, ban, a new map…). */
  apply(event: GameRoomEvent) {
    switch (event.type) {
      case 'kick':
      case 'ban':
      case 'left':
        for (const sessionId of this.sessionsOf(event.userId)) {
          const client = this.clients_.get(sessionId);
          this.remove(sessionId);
          client?.leave(event.type === 'ban' ? GAME_CLOSE.banned : event.type === 'kick' ? GAME_CLOSE.kicked : GAME_CLOSE.gone);
        }
        break;
      case 'role':
        for (const sessionId of this.sessionsOf(event.userId)) {
          const p = this.state.players.get(sessionId);
          if (!p) continue;
          p.role = event.role;
          if (event.role !== 'owner' && event.role !== 'mod') p.stage = false;
          this.refreshVoice(sessionId);
        }
        break;
      case 'timeout':
        for (const sessionId of this.sessionsOf(event.userId)) {
          const s = this.priv.get(sessionId);
          const p = this.state.players.get(sessionId);
          if (s) s.quietUntil = event.until;
          if (p) p.typing = false;
          this.refreshVoice(sessionId);
        }
        break;
      case 'guestVoice':
        this.guestVoice = event.on;
        for (const sessionId of this.priv.keys()) this.refreshVoice(sessionId);
        break;
      case 'roomWideGames':
        this.roomWideGames = event.on;
        if (!event.on) this.activities.roomWideOff();
        break;
      case 'map':
        if (event.mapId !== this.state.mapId) this.setMap(event.mapId);
        break;
      case 'deleted':
        for (const [sessionId, client] of this.clients_) {
          this.remove(sessionId);
          client.leave(GAME_CLOSE.gone);
        }
        break;
    }
  }

  /** One room at a time: they walked into another room, so they leave this one (a focus round counts). */
  walkedIn(event: GameWalkedIn) {
    if (event.roomId === this.connectaId) return;
    for (const sessionId of this.sessionsOf(event.userId)) {
      const client = this.clients_.get(sessionId);
      this.remove(sessionId);
      client?.leave(GAME_CLOSE.otherRoom);
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────────────────────

  /** Stop pressed: a focus round counts what you did. */
  private stopFocus(sessionId: string) {
    const s = this.priv.get(sessionId);
    const p = this.state.players.get(sessionId);
    if (!p || !s || s.timer.phase === 'idle') return;
    const { timer, ended } = stopTimer(s.timer, Date.now());
    s.timer = timer;
    if (ended) this.roundEnded(sessionId, ended);
    this.showStatus(p, s);
    this.tellPresence(sessionId);
  }

  /** Rounds run out into breaks, breaks into idle; the client chimes when it sees the change. */
  private tickTimers() {
    const now = Date.now();
    for (const [sessionId, s] of this.priv) {
      if (s.timer.phase === 'idle' || now < s.timer.endsAt) continue;
      const p = this.state.players.get(sessionId);
      const { timer, ended } = tickTimer(s.timer, now);
      s.timer = timer;
      if (ended) this.roundEnded(sessionId, ended);
      if (p) this.showStatus(p, s);
      if (ended) this.tellPresence(sessionId);
    }
  }

  /** A focus round ended: study buddies nearby cheer, and 1+ minute counts (saved for members). */
  private roundEnded(sessionId: string, round: EndedRound) {
    const s = this.priv.get(sessionId);
    const p = this.state.players.get(sessionId);
    if (!s || !p) return;
    this.npc.focusEnded(p, round.minutes);
    if (round.minutes < MIN_COUNTED_FOCUS_MIN) return;
    const done = (this.focusDone.get(s.userId) ?? 0) + round.minutes;
    this.focusDone.set(s.userId, done);
    p.todayMin = done;
    // Guests get the timer, but nothing is saved for them (spec 08)
    if (p.role !== 'guest') links.focusRound({ ...round, userId: s.userId, roomId: this.connectaId, subject: p.subject });
  }

  /** What shows by your name: a running focus round wins (focusing is never away), then away, then a break. */
  private showStatus(p: Player, s: Private) {
    const t = s.timer;
    p.status = t.phase === 'focus' ? 'focus' : s.away ? 'away' : t.phase;
    p.focusPreset = t.preset;
    p.statusEndsAt = p.status === 'focus' || p.status === 'break' ? t.endsAt : 0;
    p.focusSince = t.phase === 'focus' ? t.startedAt : 0;
  }

  /** The gateway hears where you are and whether you're focusing (friends see "Focusing · Calculus"). */
  private tellPresence(sessionId: string) {
    const s = this.priv.get(sessionId);
    if (!s) return;
    const focusing = s.timer.phase === 'focus';
    links.presence({
      userId: s.userId,
      tabId: tabId(sessionId),
      roomId: this.connectaId,
      focus: focusing ? (this.state.players.get(sessionId)?.subject ?? '') : null,
    });
  }

  /** Whether they may talk right now; LiveKit is told when it changes. */
  private refreshVoice(sessionId: string) {
    const p = this.state.players.get(sessionId);
    const s = this.priv.get(sessionId);
    if (!p || !s) return;
    p.mutedByMod = this.muted.has(s.userId);
    const hushed = (p.role === 'guest' && !this.guestVoice) || p.mutedByMod || s.quietUntil > Date.now();
    if (hushed === p.hushed) return;
    p.hushed = hushed;
    if (hushed) Object.assign(p, { stage: false, share: '', shareAudio: false });
    voice.current?.allow(this.connectaId, sessionId, !hushed);
  }

  private sessionsOf(userId: string) {
    return [...this.priv].filter(([, s]) => s.userId === userId).map(([id]) => id);
  }

  /** Gone for good (left, timed out, replaced, removed): out of the state and out of presence. */
  private remove(sessionId: string) {
    const s = this.priv.get(sessionId);
    if (!s) return;
    // Leaving ends a focus round and counts what you did
    if (s.timer.phase === 'focus') {
      const { ended } = stopTimer(s.timer, Date.now());
      if (ended) this.roundEnded(sessionId, ended);
    }
    const wasFull = this.priv.size >= this.capacity;
    this.activities.gone(sessionId);
    this.priv.delete(sessionId);
    this.clients_.delete(sessionId);
    this.state.players.delete(sessionId);
    voice.current?.remove(this.connectaId, sessionId);
    links.presence({ userId: s.userId, tabId: tabId(sessionId), roomId: null });
    if (wasFull && this.turnedAway && this.priv.size < this.capacity) {
      this.turnedAway = false;
      links.space(this.connectaId);
    }
  }

  /** A new map (Room settings, live switch): everyone stands up at its door. */
  private setMap(mapId: string) {
    this.map = mapDataFor(mapId);
    this.state.mapId = this.map.id;
    for (const p of this.state.players.values()) {
      const spot = this.doorSpot();
      Object.assign(p, { seatId: '', x: spot.x, z: spot.z, yaw: Math.PI, moving: false, share: '', shareAudio: false });
    }
    // The new map's resident cats; summoned friends don't come along
    this.npc.reset();
    this.tv.off();
    this.activities.mapChanged();
    // A new wall: the drawing goes with the old map
    if (this.board?.clear()) this.broadcast('board:clear');
  }

  /** The framework's window on this room */
  /** Someone standing in front of the whiteboard who may draw (not timed out) */
  private atBoard(sessionId: string) {
    const p = this.state.players.get(sessionId);
    const s = this.priv.get(sessionId);
    if (!p || !s || s.quietUntil > Date.now() || !inArea(this.map.boardArea, p.x, p.z)) return null;
    return s;
  }

  private makeSide() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias -- the floor reads the room's current map
    const room = this;
    return new SideFloor(this.state.side, {
      get map() {
        return room.map;
      },
      at: (sessionId) => this.state.players.get(sessionId) ?? null,
      away: (sessionId) => !!this.state.spots.get('floor')?.awaySince.has(sessionId),
      roundPlayers: () => [...(this.state.spots.get('floor')?.players ?? [])],
    });
  }

  private makeActivities() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias -- the host reads the room's current map
    const room = this;
    const activities = new Activities(this.state.spots, {
      get map() {
        return room.map;
      },
      get players() {
        return room.state.players;
      },
      standUp: (p) => this.standUp(p),
      get roomWideGames() {
        return room.roomWideGames;
      },
      send: (sessionId, type, message) => this.clients_.get(sessionId)?.send(type, message),
    });
    activities.add(ChessTable.spot, this.chess);
    activities.add(SlaveTable.spot, this.slave);
    activities.add(SideFloor.spot, this.side);
    return activities;
  }

  /** The NPC code's window on this room */
  private makeNpcs() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias -- the host reads the room's current map
    const room = this;
    return new NpcDirector({
      get state() {
        return room.state;
      },
      get map() {
        return room.map;
      },
      say: (id, text) => {
        const npc = this.state.npcs.get(id);
        if (npc) this.toHearers(npc, 'npc:said', { id, text });
      },
      react: (id, emote) => {
        const npc = this.state.npcs.get(id);
        if (npc) this.toHearers(npc, 'npc:react', { id, emote } satisfies NpcReact);
      },
      note: (text) => this.broadcast('npc:note', { text } satisfies NpcNote),
      summoned: (event) => this.broadcast('npc:summoned', event satisfies NpcSummoned),
    });
  }

  /** Whoever hears something said here: the whole room, or only the private zone it's in */
  private toHearers(at: { x: number; z: number }, type: string, message: unknown) {
    const zone = zoneAtIn(this.map, at.x, at.z);
    if (!zone) return void this.broadcast(type, message);
    for (const [sessionId, c] of this.clients_) {
      const o = this.state.players.get(sessionId);
      if (o && zoneAtIn(this.map, o.x, o.z)?.id === zone.id) c.send(type, message);
    }
  }

  private atTv(client: Client) {
    const p = this.state.players.get(client.sessionId);
    return !!p && inArea(this.map.tvArea, p.x, p.z);
  }

  /** A pasted link: checked with YouTube first, then on now or into Up next */
  private async addVideo(client: Client, link: string) {
    const refuse = (reason: WatchRefused['reason']) => client.send('watch:refused', { reason } satisfies WatchRefused);
    const videoId = parseYouTube(link);
    if (!videoId) return refuse('link');
    if (!this.atTv(client)) return refuse('away');
    const found = await youtube.lookup(videoId);
    const p = this.state.players.get(client.sessionId);
    if (!p) return;
    if (!found) return refuse('unavailable');
    if (!this.tv.add({ videoId, title: found.title, by: client.sessionId, byName: p.name }, Date.now())) refuse('full');
  }

  private tickTv() {
    let watchers = 0;
    let sharing = false;
    for (const p of this.state.players.values()) {
      if (inArea(this.map.tvArea, p.x, p.z)) watchers++;
      if (p.share === 'tv') sharing = true;
    }
    this.tv.tick(Date.now(), watchers, sharing);
  }

  /** Walking off the TV rug or standing up from your desk ends your share */
  private checkShare(p: Player) {
    if (!p.share) return;
    const here = p.share === 'tv' ? inArea(this.map.tvArea, p.x, p.z) : p.share === `table:${this.map.seatById.get(p.seatId)?.tableId}`;
    if (!here) Object.assign(p, { share: '', shareAudio: false });
  }

  /** Near the door, spread out a little so people walking in together don't stack. */
  private doorSpot() {
    const { spawn, bounds } = this.map;
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * 0.8;
    return {
      x: clamp(spawn.x + Math.cos(a) * r, bounds.minX, bounds.maxX),
      z: clamp(spawn.z + Math.sin(a) * r * 0.5, bounds.minZ, bounds.maxZ),
    };
  }

  /** Step out to the seat's stand-up spot (behind a chair, in front of the sofa). */
  private standUp(p: Player) {
    const out = this.map.seatById.get(p.seatId)?.out ?? p;
    p.x = clamp(out.x, this.map.bounds.minX, this.map.bounds.maxX);
    p.z = clamp(out.z, this.map.bounds.minZ, this.map.bounds.maxZ);
    p.seatId = '';
  }
}

/** Presence counts each connection as a tab of its own. */
const tabId = (sessionId: string) => `game:${sessionId}`;

const cleanSubject = (subject: string) => subject.trim().slice(0, SUBJECT_MAX);

export type { PlayerRole };
