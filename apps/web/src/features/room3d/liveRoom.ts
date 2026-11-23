import { Callbacks } from '@colyseus/sdk';
import type {
  AvatarLook,
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
} from '@connecta/shared';
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
  'moveSeq',
] as const satisfies readonly (keyof PlayerView)[];

/** Fields the HUD shows (your role and tools, mic rights, 💤, 📢); positions are read every frame instead */
const SHOWN = [
  'role',
  'status',
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
  private unsubscribe: () => void;

  constructor(
    map: MapDef,
    private readonly game: GameRoom,
    me: { name: string; look: AvatarLook },
  ) {
    super(map, me, [], []);
    // The mock's own cats give way to the server's
    this.state.npcs.clear();
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
    ];
    this.unsubscribe = () => {
      game.onStateChange.remove(sync);
      for (const off of offs) off?.();
    };
    this.sync();
  }

  /** The map the game server says the room is on (an owner's live switch moves everyone). */
  get serverMapId() {
    return this.game.state?.mapId ?? '';
  }

  dispose() {
    this.unsubscribe();
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

  override setStatus(status: PlayerView['status'], subject = '') {
    this.game.send('status', { status, subject });
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
