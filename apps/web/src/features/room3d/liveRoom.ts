import { Callbacks } from '@colyseus/sdk';
import type { AvatarLook, PlayerView, Quiet, Said } from '@connecta/shared';
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
  'moveSeq',
] as const satisfies readonly (keyof PlayerView)[];

/**
 * A real room (build step 4) behind the same surface the 3D view and the demo's scripts use: the
 * game server's players are mirrored into `state.players` (you stay under 'me', everyone else under
 * their session id), and your moves go to the server. The objects are updated in place, so avatars
 * read them every frame. The cats are still this browser's own until part 5 brings server NPCs.
 */
export class LiveRoom extends MockRoom {
  private unsubscribe: () => void;

  constructor(
    map: MapDef,
    private readonly game: GameRoom,
    me: { name: string; look: AvatarLook },
  ) {
    super(map, me, [], []);
    const sync = () => this.sync();
    game.onStateChange(sync);
    // Who's here changes rarely; a full sync on each patch keeps positions current
    const callbacks = Callbacks.get(game as unknown as Parameters<typeof Callbacks.get>[0]) as unknown as {
      onAdd(c: 'players', cb: () => void): () => void;
      onRemove(c: 'players', cb: () => void): () => void;
    };
    const offs = [
      callbacks.onAdd('players', sync),
      callbacks.onRemove('players', sync),
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

  /** Your new look, for everyone (at most once every 5 s). */
  setLook(look: AvatarLook) {
    this.game.send('look', { look });
  }

  override send(type: string, payload: unknown) {
    if (type === 'move' || type === 'sit' || type === 'stand') this.game.send(type, payload);
    else super.send(type, payload);
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
      for (const f of FIELDS) (local as unknown as Record<string, unknown>)[f] = remote[f];
    }
    for (const id of [...this.state.players.keys()]) {
      if (id !== 'me' && !seen.has(id)) {
        this.state.players.delete(id);
        changed = true;
      }
    }
    if (changed) this.changed();
  }
}
