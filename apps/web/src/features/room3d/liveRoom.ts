import { Callbacks } from '@colyseus/sdk';
import type { AvatarLook, PlayerView } from '@connecta/shared';
import type { GameRoom } from '@/features/game/useGame';
import type { MapDef } from '../map/types';
import { MockRoom, player } from './mockRoom';

/** What we copy from the game server's players (everything a client reads). */
const FIELDS = [
  'userId',
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
    const offs = [callbacks.onAdd('players', sync), callbacks.onRemove('players', sync)];
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
