import { Callbacks } from '@colyseus/sdk';
import { BOARD_ADD_MAX } from '@connecta/shared';
import type {
  AvatarLook,
  FocusPreset,
  NpcKind,
  NpcNote,
  NpcReact,
  NpcRefused,
  NpcSummoned,
  NpcView,
  PlayerView,
  Quiet,
  Said,
  VoicePass,
  WatchRefused,
  WatchVideo,
  ActivityOut,
  SlaveHand,
  BoardAdd,
  BoardStroke,
  TelTurn,
} from '@connecta/shared';
import type { ActivityRemote, SpotState, Video, WatchRemote, WatchState } from '../activities/hub';
import type { SpotId } from '../activities/spots';
import type { ChessGame, EndReason } from '../activities/chess/game';
import type { SlaveGame, Title } from '../activities/slave/game';
import type { BoardStore } from '../activities/board/board';
import { BUILT_IN, deckKindFor, type Deck, type SideGame, type SideMode } from '../activities/pickASide/game';
import { deckPass } from '../activities/pickASide/useRoomDecks';
import type { Stroke } from '../activities/board/board';
import type { Entry, TelGame, TelMode } from '../activities/telephone/game';
import type { PieceSymbol, Square } from 'chess.js';
import type { GameRoom } from '@/features/game/useGame';
import type { MapDef } from '../map/types';
import { MockRoom, player } from './mockRoom';

/** What we copy from the game server's players (everything a client reads). */
const FIELDS = [
  'userId',
  'handle',
  'role',
  'name',
  'look',
  'x',
  'z',
  'yaw',
  'moving',
  'seatId',
  'status',
  'focusPreset',
  'statusEndsAt',
  'subject',
  'focusSince',
  'todayMin',
  'typing',
  'stage',
  'hushed',
  'mutedByMod',
  'deaf',
  'share',
  'shareAudio',
  'photo',
  'moveSeq',
] as const satisfies readonly (keyof PlayerView)[];

/** Fields the HUD shows (your role and tools, mic rights, 💤, 📢); positions are read every frame instead */
const SHOWN = [
  'role',
  'status',
  'subject',
  'todayMin',
  'stage',
  'hushed',
  'mutedByMod',
  'deaf',
  'share',
  'shareAudio',
  'seatId',
] as const satisfies readonly (typeof FIELDS)[number][];

const NPC_FIELDS = [
  'kind',
  'name',
  'look',
  'x',
  'z',
  'y',
  'yaw',
  'moving',
  'anim',
  'seatId',
  'status',
  'statusEndsAt',
  'focusSince',
  'subject',
  'following',
] as const satisfies readonly (keyof NpcView)[];

/** What the server's cats and study buddies say and do, besides moving */
export interface NpcEvents {
  summoned(event: NpcSummoned): void;
  said(id: string, text: string): void;
  react(id: string, emote: string): void;
  note(text: string): void;
  refused(reason: string): void;
}

/**
 * A real room (build step 4) behind the same surface the 3D view and the demo's scripts use: the
 * game server's players are mirrored into `state.players` (you stay under 'me', everyone else under
 * their session id), and your moves go to the server. The objects are updated in place, so avatars
 * read them every frame. The cats and study buddies are the game server's too, mirrored the same way
 * into `state.npcs`.
 */
export class LiveRoom extends MockRoom {
  constructor(
    map: MapDef,
    private readonly game: GameRoom,
    me: { name: string; look: AvatarLook },
  ) {
    super(map, me, [], []);
    // The mock's own cats give way to the server's
    this.state.npcs.clear();
    this.sync();
  }

  /**
   * Starts following the game server; returns the stop. Called from an effect (not the constructor)
   * so React's development double mount, which runs a clean-up straight away, attaches again.
   */
  attach() {
    const game = this.game;
    const sync = () => this.sync();
    game.onStateChange(sync);
    // Who's here changes rarely; a full sync on each patch keeps positions current
    const callbacks = Callbacks.get(game as unknown as Parameters<typeof Callbacks.get>[0]) as unknown as {
      onAdd(c: 'players' | 'npcs', cb: () => void): () => void;
      onRemove(c: 'players' | 'npcs', cb: () => void): () => void;
    };
    const offs = [
      callbacks.onAdd('players', sync),
      callbacks.onRemove('players', sync),
      callbacks.onAdd('npcs', sync),
      callbacks.onRemove('npcs', sync),
      game.onMessage('npc:summoned', (m: NpcSummoned) => this.npcListeners.forEach((l) => l.summoned(m))),
      game.onMessage('npc:said', (m: Said) => this.npcListeners.forEach((l) => l.said(m.id, m.text))),
      game.onMessage('npc:react', (m: NpcReact) => this.npcListeners.forEach((l) => l.react(m.id, m.emote))),
      game.onMessage('npc:note', (m: NpcNote) => this.npcListeners.forEach((l) => l.note(m.text))),
      game.onMessage('npc:refused', (m: NpcRefused) => this.npcListeners.forEach((l) => l.refused(m.reason))),
      game.onMessage('said', (m: Said) => this.saidListeners.forEach((fn) => fn(m.id === game.sessionId ? 'me' : m.id, m.text))),
      game.onMessage('quiet', (m: Quiet) => this.quietListeners.forEach((fn) => fn(m.until))),
      game.onMessage('slave:hand', (m: SlaveHand) => (this.slaveHand = m)),
      // Draw & Guess: what you work from, the album, and "time's up, send what you have"
      game.onMessage('tel:turn', (m: TelTurn) => {
        this.telTurn = m;
        this.telSent = -1;
        // A new game: last game's album goes
        if (m.step === 0) this.telAlbum = null;
        this.telVersion++;
      }),
      game.onMessage('tel:album', (m: { chains: Entry[][] }) => {
        this.telAlbum = m.chains;
        this.telVersion++;
      }),
      game.onMessage('tel:collect', (m: { step: number }) => this.sendTel(m.step, this.telDraftNow)),
    ];
    // Slave: your cards, in case a game is on (they only come when they change)
    game.send('slave:hand');
    game.send('tel:sync');
    this.sync();
    return () => {
      clearTimeout(this.subjectTimer);
      game.onStateChange.remove(sync);
      for (const off of offs) off?.();
    };
  }

  /** The map the game server says the room is on (an owner's live switch moves everyone). */
  get serverMapId() {
    return this.game.state?.mapId ?? '';
  }

  // --- Watch together (feature 10): the game server's big screen ---

  /** The server's screen in the activity hub's shape (you're 'me'; a TV share is a player's) */
  watchState(): Omit<WatchState, 'resume'> {
    const w = this.game.state?.watch;
    const key = (sessionId: string) => (sessionId === this.game.sessionId ? 'me' : sessionId);
    const video = (v: WatchVideo): Video => ({ id: v.videoId, title: v.title, key: v.key, by: key(v.by), byName: v.byName });
    let share: WatchState['share'] = null;
    this.game.state?.players?.forEach((p, id) => {
      if (p.share === 'tv') share = { by: key(id), audio: p.shareAudio };
    });
    if (!w) return { now: null, queue: [], offset: 0, startedAt: 0, paused: false, share };
    return {
      now: w.videoId ? video(w) : null,
      queue: [...w.queue].map(video),
      offset: w.offset,
      startedAt: w.startedAt,
      paused: w.paused,
      share,
    };
  }

  /** The hub's way to the server's screen */
  readonly watchRemote: WatchRemote = {
    state: () => this.watchState(),
    add: (videoId) => this.game.send('watch:add', { link: videoId }),
    pause: (paused) => this.game.send('watch:pause', { paused }),
    seek: (seconds) => this.game.send('watch:seek', { seconds }),
    next: (key) => this.game.send('watch:next', { key }),
    remove: (key) => this.game.send('watch:remove', { key }),
  };

  /** Photo mode open or closed: others see 📸 by your name */
  setPhoto(on: boolean) {
    this.game.send('photo', { on });
  }

  // --- Activities (feature 9): the spots the game server runs, chess for now ---

  private key(sessionId: string) {
    return sessionId === this.game.sessionId ? 'me' : sessionId;
  }

  /** The chess game in the rules' shape, rebuilt only when it changes (the board replays its moves) */
  private chessCache: { rev: number; game: ChessGame | null } = { rev: -1, game: null };
  private chessView(): ChessGame | null {
    const c = this.game.state?.chess;
    if (!c) return null;
    if (c.rev === this.chessCache.rev) return this.chessCache.game;
    const key = (id: string) => this.key(id);
    const game: ChessGame | null = c.fen
      ? {
          white: key(c.white),
          black: key(c.black),
          moves: [...c.moves],
          fen: c.fen,
          last: c.lastFrom ? { from: c.lastFrom as Square, to: c.lastTo as Square } : null,
          taken: { w: [...c.takenW] as PieceSymbol[], b: [...c.takenB] as PieceSymbol[] },
          drawOffer: c.drawOffer ? key(c.drawOffer) : null,
          end: c.endWhy ? { winner: c.endWinner ? key(c.endWinner) : null, why: c.endWhy as EndReason } : null,
          rev: c.rev,
        }
      : null;
    this.chessCache = { rev: c.rev, game };
    return game;
  }

  /** Your own Slave cards: only you get them */
  private slaveHand: SlaveHand | null = null;
  private slaveCache: { key: string; game: SlaveGame | null } = { key: '', game: null };
  /** Slave in the rules' shape: your hand, blanks for the others' (rebuilt only when it changes) */
  private slaveView(): SlaveGame | null {
    const s = this.game.state?.slave;
    const hand = this.slaveHand;
    if (!s) return null;
    const cacheKey = `${s.rev}/${hand?.rev ?? -1}/${hand?.cards.length ?? -1}`;
    if (cacheKey === this.slaveCache.key) return this.slaveCache.game;
    const key = (id: string) => this.key(id);
    const players = [...s.players];
    const game: SlaveGame | null = s.stage
      ? {
          players: players.map(key),
          hands: Object.fromEntries(
            players.map((id) => [
              key(id),
              id === this.game.sessionId && hand ? [...hand.cards] : Array<number>(s.counts.get(id) ?? 0).fill(-1),
            ]),
          ),
          pile: s.pileBy ? { by: key(s.pileBy), cards: [...s.pileCards] } : null,
          passed: [...s.passed].map(key),
          turn: key(s.turn),
          until: s.until,
          finished: [...s.finished].map(key),
          gone: [...s.gone].map(key),
          titles: Object.fromEntries([...s.titles.entries()].map(([id, t]) => [key(id), t as Title])),
          swap: [...s.swap].map((x) => ({
            giver: key(x.giver),
            to: key(x.to),
            count: x.count,
            got: x.giver === this.game.sessionId ? [...(hand?.got ?? [])] : [],
          })),
          stage: s.stage as SlaveGame['stage'],
          rev: s.rev,
        }
      : null;
    this.slaveCache = { key: cacheKey, game };
    return game;
  }

  private sideCache: { rev: number; game: SideGame | null; deck: Deck | null } = { rev: -1, game: null, deck: null };
  /** Pick a Side in the rules' shape: only the question being asked is real, the others blanks */
  private sideView() {
    const s = this.game.state?.side;
    if (!s) return this.sideCache;
    if (s.rev === this.sideCache.rev) return this.sideCache;
    const key = (id: string) => this.key(id);
    const builtIn = BUILT_IN.find((d) => d.id === s.deckId);
    const deck: Deck = builtIn ?? {
      id: s.deckId,
      name: s.deckName,
      emoji: s.deckEmoji,
      kind: deckKindFor(this.game.state.spots?.get('floor')?.gameId ?? 'wyr'),
      source: 'room',
      questions: Array.from({ length: s.deckCount }, (_, i) => ({ id: `${s.deckId}-${i}`, q: '', answers: [] })),
    };
    let game: SideGame | null = null;
    if (s.stage) {
      const me = this.game.sessionId;
      const picks = (id: string) => s.picks.get(id)?.split(',') ?? [];
      const mine = picks(me);
      const agree: Record<string, number> = {};
      s.picks.forEach((_, id) => {
        if (id === me) return;
        const n = picks(id).filter((a, i) => a !== '-' && a === mine[i]).length;
        if (n) agree[key(id)] = n;
      });
      const answers: Record<string, number | null> = {};
      s.answers.forEach((a, id) => (answers[key(id)] = a < 0 ? null : a));
      const scores: Record<string, number> = {};
      s.scores.forEach((n, id) => (scores[key(id)] = n));
      game = {
        mode: s.mode as SideMode,
        deck,
        questions: Array.from({ length: s.count }, (_, i) =>
          i === s.i
            ? { id: `${s.deckId}-q${i}`, q: s.q, answers: [...s.choices], ...(s.right >= 0 ? { right: s.right } : {}) }
            : { id: `${s.deckId}-q${i}`, q: '', answers: [] },
        ),
        i: s.i,
        stage: s.stage as SideGame['stage'],
        until: s.until,
        answers,
        scores,
        agree,
        winners: [...s.winners].map(key),
        solo: s.solo,
      };
    }
    this.sideCache = { rev: s.rev, game, deck };
    return this.sideCache;
  }

  // --- Draw & Guess: only what you may see (your turn's source, then the album) ---
  private telTurn: TelTurn | null = null;
  private telAlbum: Entry[][] | null = null;
  private telVersion = 0;
  private telSent = -1;
  private telDraftNow: { text: string; strokes: Stroke[] } = { text: '', strokes: [] };
  private telCache: { key: string; game: TelGame | null } = { key: '', game: null };

  private sendTel(step: number, entry: { text?: string; strokes?: { color: string; size: number; pts: number[] }[] }) {
    if (this.telSent === step) return;
    this.telSent = step;
    // A drawing goes in pieces: a WebSocket message stays under the server's 4 KB, like the whiteboard's
    entry.strokes?.forEach(({ color, size, pts }, s) => {
      for (let i = 0; i < pts.length || i === 0; i += BOARD_ADD_MAX)
        this.game.send('tel:part', { step, s, color, size, pts: pts.slice(i, i + BOARD_ADD_MAX) });
    });
    this.game.send('tel:send', { step, text: entry.text });
  }

  private telView(): TelGame | null {
    const s = this.game.state?.tel;
    if (!s || !s.stage || s.stage === 'done') {
      if (s?.stage === '' && this.telAlbum) this.telAlbum = null;
      return null;
    }
    const cacheKey = `${s.rev}/${this.telVersion}`;
    if (cacheKey === this.telCache.key) return this.telCache.game;
    const key = (id: string) => this.key(id);
    const order = [...s.order];
    const chains: Entry[][] =
      s.stage === 'reveal' && this.telAlbum
        ? this.telAlbum.map((chain) => chain.map((e) => ({ ...e, by: key(e.by) })))
        : order.map(() => []);
    if (s.stage === 'turn' && this.telTurn?.source && this.telTurn.step === s.step) {
      // Your chain's latest entry, where the rules look for it
      const n = order.length;
      const c = (((order.indexOf(this.game.sessionId) - s.step) % n) + n) % n;
      chains[c]![s.step - 1] = { ...this.telTurn.source, by: key(this.telTurn.source.by) };
    }
    const reactions: Record<string, Record<string, number>> = {};
    s.reactions.forEach((n, k) => {
      const [chain, entry, emoji] = k.split(':');
      (reactions[`${chain}:${entry}`] ??= {})[emoji!] = n;
    });
    const game: TelGame = {
      mode: s.mode as TelMode,
      order: order.map(key),
      steps: s.steps,
      step: s.step,
      stage: s.stage as TelGame['stage'],
      until: s.until,
      lookUntil: s.lookUntil,
      chains,
      sent: Object.fromEntries([...s.sent].map((id) => [key(id), true])),
      empty: {},
      reveal: { chain: s.revealChain, shown: s.revealShown, paused: s.revealPaused, nextAt: 0 },
      reactions,
      rev: s.rev + this.telVersion,
    };
    this.telCache = { key: cacheKey, game };
    return game;
  }

  /** The hub's way to the spots the server runs */
  readonly activityRemote: ActivityRemote = {
    spots: () => {
      const out: ReturnType<ActivityRemote['spots']> = {};
      const key = (id: string) => this.key(id);
      this.game.state?.spots?.forEach((s, id) => {
        const awaySince: Record<string, number> = {};
        s.awaySince.forEach((at, who) => (awaySince[key(who)] = at));
        out[id as SpotId] = {
          phase: s.phase as SpotState['phase'],
          gameId: s.gameId,
          hostId: s.hostId ? key(s.hostId) : null,
          players: [...s.players].map(key),
          nextRound: [...s.nextRound].map(key),
          out: [...s.out].map(key),
          awaySince,
          optedOut: [],
          arriving: false,
          since: 0,
          startsAt: s.startsAt,
          invite: s.inviteAt ? { by: key(s.inviteBy), at: s.inviteAt } : null,
          results: [...s.results].map(key),
          resultsUntil: s.resultsUntil,
        };
      });
      return out;
    },
    chess: () => this.chessView(),
    begin: () => this.game.send('activity:begin'),
    end: () => this.game.send('activity:end'),
    call: () => this.game.send('activity:call'),
    leave: () => this.game.send('activity:leave'),
    chessMove: (from, to, promotion) => this.game.send('chess:move', { from, to, promotion }),
    chessResign: () => this.game.send('chess:resign'),
    chessOfferDraw: () => this.game.send('chess:draw:offer'),
    chessAnswerDraw: (accept) => this.game.send('chess:draw:answer', { accept }),
    slave: () => this.slaveView(),
    slavePlay: (cards) => this.game.send('slave:play', { cards }),
    slavePass: () => this.game.send('slave:pass'),
    slaveGiveBack: (cards) => this.game.send('slave:giveBack', { cards }),
    side: () => this.sideView().game,
    floorDeck: () => this.sideView().deck,
    open: (spot) => this.game.send('activity:start', { spot }),
    tel: () => this.telView(),
    telSend: (entry) => this.sendTel(this.game.state.tel?.step ?? 0, entry),
    telDraft: (text, strokes) => (this.telDraftNow = { text, strokes }),
    telReact: (chain, entry, emoji) => this.game.send('tel:react', { chain, entry, emoji }),
    telPause: (paused) => this.game.send('tel:pause', { paused }),
    telNext: () => this.game.send('tel:next'),
    pickGame: (gameId) => this.game.send('activity:game', { gameId }),
    pickDeck: (deck) => {
      if (deck.source === 'built-in') return this.game.send('side:deck', { builtIn: deck.id });
      // A room deck: the API signs it for this room's game server
      void deckPass(deck.id).then((pass) => pass && this.game.send('side:deck', { pass }));
    },
  };

  /**
   * The whiteboard (feature 11): your strokes go to the game server, everyone else's come into the
   * board's store. Returns the way to disconnect.
   */
  connectBoard(board: BoardStore) {
    const game = this.game;
    board.remote = {
      sessionId: game.sessionId,
      start: (n, color, size, pts) => game.send('board:start', { n, color, size, pts }),
      add: (n, pts) => game.send('board:add', { n, pts }),
      undo: () => game.send('board:undo'),
      clear: () => game.send('board:clear'),
    };
    const offs = [
      game.onMessage('board:start', (s: BoardStroke) => board.put(s)),
      game.onMessage('board:add', (m: BoardAdd) => board.extend(m.id, m.pts)),
      game.onMessage('board:undo', (m: { id: string }) => board.remove(m.id)),
      game.onMessage('board:clear', () => board.wipe()),
      game.onMessage('board:all', (m: { strokes: BoardStroke[] }) => board.replace(m.strokes)),
    ];
    game.send('board:sync');
    return () => {
      offs.forEach((off) => off());
      board.remote = null;
    };
  }

  /** A round let you go (you pressed Leave, or were away from it for 30 s) */
  onActivityOut(fn: (out: ActivityOut) => void) {
    return this.game.onMessage('activity:out', fn);
  }

  /** Owners and mods: everything off the big screen */
  watchOff() {
    this.game.send('watch:off');
  }

  /** A link the server wouldn't put on, and why */
  onWatchRefused(fn: (reason: WatchRefused['reason']) => void) {
    return this.game.onMessage('watch:refused', (m: WatchRefused) => fn(m.reason));
  }

  private saidListeners = new Set<(id: string, text: string) => void>();
  private quietListeners = new Set<(until: number) => void>();
  /** A bubble someone said (you're 'me'), as the server let it through (private zones, time outs). */
  onSaid(fn: (id: string, text: string) => void) {
    this.saidListeners.add(fn);
    return () => void this.saidListeners.delete(fn);
  }
  /** You're timed out: nothing goes out until then. */
  onQuiet(fn: (until: number) => void) {
    this.quietListeners.add(fn);
    return () => void this.quietListeners.delete(fn);
  }

  private npcListeners = new Set<NpcEvents>();
  /** The Buddy Machine's news, NPC bubbles and hearts */
  onNpc(events: NpcEvents) {
    this.npcListeners.add(events);
    return () => void this.npcListeners.delete(events);
  }

  /** Pull the Buddy Machine's knob; what happens comes back through onNpc */
  override summon(kind: NpcKind) {
    this.game.send('npc:summon', { kind });
    return null;
  }

  override goodbye(id: string) {
    this.game.send('npc:goodbye', { id });
  }

  say(text: string) {
    this.game.send('say', { text });
  }

  override setTyping(typing: boolean) {
    this.game.send('typing', { typing });
  }

  // Your status is the server's now: away from `setAway`, focus and breaks from the timer it runs
  override setStatus() {}

  /** No input for 10 minutes: 💤 and the mic off (a running focus round still shows as focus) */
  setAway(on: boolean) {
    this.game.send('away', { on });
  }

  /** Start a focus round on the server (25/5 or 50/10); one running elsewhere ends */
  focusStart(preset: FocusPreset, subject: string) {
    this.game.send('focus:start', { preset, subject });
  }

  focusStop() {
    this.game.send('focus:stop', {});
  }

  private subjectTimer: ReturnType<typeof setTimeout> | undefined;
  /** What you're studying; sent once you pause typing */
  focusSubject(subject: string) {
    clearTimeout(this.subjectTimer);
    this.subjectTimer = setTimeout(() => this.game.send('focus:subject', { subject }), 400);
  }

  /** Talk to everyone (the server checks you're the owner or a mod). */
  setStage(on: boolean) {
    this.game.send('stage', { on });
  }

  /** Your session id: your voice's identity in LiveKit (everyone else's is their key in `state.players`) */
  get voiceId() {
    return this.game.sessionId;
  }

  /** A pass to the room's voice (listening only when you can't talk) */
  voicePass() {
    return new Promise<VoicePass>((resolve) => {
      const off = this.game.onMessage('voice', (pass: VoicePass) => {
        off?.();
        resolve(pass);
      });
      this.game.send('voice', {});
    });
  }

  setDeaf(on: boolean) {
    this.game.send('deaf', { on });
  }

  /** Mute for everyone (the owner and mods; the server checks), by session id */
  muteForEveryone(id: string, on: boolean) {
    this.game.send('mute', { id, on });
  }

  /** Share your screen on the TV or to your table ('' stops); the server checks you're there */
  setShare(where: 'tv' | 'table' | '', audio = false) {
    this.game.send('share', { where, audio });
  }

  /** Your new look, for everyone (at most once every 5 s). */
  setLook(look: AvatarLook) {
    this.game.send('look', { look });
  }

  override send(type: string, payload: unknown) {
    if (type === 'move' || type === 'sit' || type === 'stand') this.game.send(type, payload);
    else if (type === 'npc:pet') {
      this.game.send(type, payload);
      super.send(type, payload); // today's quest, still counted here until coins and quests are ported
    } else super.send(type, payload);
  }

  // The demo's scripts walk scripted people around; real people walk themselves
  override sendTo() {}
  override traveling() {
    return false;
  }

  private sync() {
    const players = this.game.state?.players;
    if (!players) return;
    let changed = false;
    const seen = new Set<string>();
    for (const [sessionId, remote] of players) {
      const id = sessionId === this.game.sessionId ? 'me' : sessionId;
      seen.add(id);
      let local = this.state.players.get(id);
      if (!local) {
        local = player({ name: remote.name, look: remote.look, x: remote.x, z: remote.z });
        this.state.players.set(id, local);
        changed = true;
      }
      // The HUD re-renders on a version bump: for what the people list and the dock show
      if (SHOWN.some((f) => local[f] !== remote[f])) changed = true;
      for (const f of FIELDS) (local as unknown as Record<string, unknown>)[f] = remote[f];
    }
    for (const id of [...this.state.players.keys()]) {
      if (id !== 'me' && !seen.has(id)) {
        this.state.players.delete(id);
        changed = true;
      }
    }
    if (this.syncNpcs()) changed = true;
    if (changed) this.changed();
  }

  /** The cats and study buddies; true when the HUD should re-render (one came or went, a nap, a desk) */
  private syncNpcs() {
    const npcs = this.game.state?.npcs;
    if (!npcs) return false;
    let changed = false;
    for (const [id, remote] of npcs) {
      let local = this.state.npcs.get(id);
      if (!local) {
        local = { ...remote } as NpcView;
        this.state.npcs.set(id, local);
        changed = true;
      }
      // A cat following you follows 'me' here
      const following = remote.following && remote.following === this.game.sessionId ? 'me' : remote.following;
      if (
        local.status !== remote.status ||
        local.seatId !== remote.seatId ||
        local.following !== following ||
        (local.anim === 'nap') !== (remote.anim === 'nap')
      )
        changed = true;
      for (const f of NPC_FIELDS) (local as unknown as Record<string, unknown>)[f] = remote[f];
      local.following = following;
    }
    for (const id of [...this.state.npcs.keys()]) {
      if (!npcs.has(id)) {
        this.state.npcs.delete(id);
        changed = true;
      }
    }
    return changed;
  }
}
