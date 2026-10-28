import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GACHA_MACHINE, NPC_LIMITS, SEATS, SPIN_COOLDOWN_MS, SPIN_REVEAL_MS, type GachaSpun } from '@study/shared';
import { Player, StudyState } from '../state';
import { NpcDirector } from './NpcDirector';

/** A director wired to a fake room that records everything it would broadcast. */
function setup() {
  const state = new StudyState();
  const events = {
    said: [] as { npcId: string; text: string }[],
    reacted: [] as string[],
    announced: [] as string[],
    spun: [] as GachaSpun[],
  };
  const director = new NpcDirector({
    state,
    say: (npcId, text) => events.said.push({ npcId, text }),
    react: (_id, emote) => events.reacted.push(emote),
    announce: (text) => events.announced.push(text),
    spun: (e) => events.spun.push(e),
  });
  const join = (id: string, at: { x: number; z: number } = { x: GACHA_MACHINE.x + 1, z: GACHA_MACHINE.z }) => {
    const p = new Player();
    p.name = id;
    p.x = at.x;
    p.z = at.z;
    state.players.set(id, p);
    return p;
  };
  /** Advance the 10 Hz simulation by `ms`. */
  const run = (ms: number) => {
    for (let t = 0; t < ms; t += 100) {
      vi.advanceTimersByTime(100);
      director.tick(0.1);
    }
  };
  return { state, events, director, join, run };
}

beforeEach(() => vi.useFakeTimers({ now: new Date('2026-10-29T03:00:00Z') })); // 10:00 in Bangkok
afterEach(() => vi.useRealTimers());

describe('Buddy Machine', () => {
  it('refuses spins from across the room', () => {
    const { director, join } = setup();
    const far = join('mint', { x: 0, z: 0 });
    expect(director.spin('mint', far, 'cat')).toMatch(/walk up/i);
  });

  it('announces the capsule first, then reveals the NPC after the animation', () => {
    const { director, join, state, events, run } = setup();
    director.spin('mint', join('mint'), 'cat');
    expect(events.spun).toHaveLength(1);
    expect(state.npcs.size).toBe(0);
    run(SPIN_REVEAL_MS + 100);
    expect(state.npcs.has(events.spun[0]!.npcId)).toBe(true);
    expect(events.announced.at(-1)).toMatch(/mint summoned an? .*cat/);
  });

  it('enforces the per-person cooldown', () => {
    const { director, join, run } = setup();
    const p = join('mint');
    expect(director.spin('mint', p, 'cat')).toBeNull();
    expect(director.spin('mint', p, 'cat')).toMatch(/cooling down/);
    run(SPIN_COOLDOWN_MS);
    expect(director.spin('mint', p, 'cat')).toBeNull();
  });

  it('caps NPCs per kind, counting capsules still rolling out', () => {
    const { director, join } = setup();
    for (let i = 0; i < NPC_LIMITS.cat; i++) expect(director.spin(`p${i}`, join(`p${i}`), 'cat')).toBeNull();
    expect(director.spin('extra', join('extra'), 'cat')).toMatch(/plenty of cats/);
    expect(director.spin('extra', join('extra'), 'buddy')).toBeNull();
  });
});

describe('editing', () => {
  it('renames and announces it, ignoring blank names', () => {
    const { director, state, events } = setup();
    const id = director.spawn('cat', { name: 'Mochi' });
    director.update(id, { name: '  Captain Fluff ' }, 'mint');
    expect(state.npcs.get(id)!.name).toBe('Captain Fluff');
    expect(events.announced.at(-1)).toBe('✏️ mint renamed Mochi to Captain Fluff');
    director.update(id, { name: '   ' }, 'mint');
    expect(state.npcs.get(id)!.name).toBe('Captain Fluff');
  });

  it('sanitises buddy settings', () => {
    const { director, state } = setup();
    const id = director.spawn('buddy');
    director.update(id, { settings: { focusMin: 999, chatty: 'yes', subject: '  Physics  ' } }, 'mint');
    const settings = JSON.parse(state.npcs.get(id)!.settings);
    expect(settings).toMatchObject({ focusMin: 25, chatty: true, subject: 'Physics' });
  });

  it('walks an NPC back into the machine on goodbye', () => {
    const { director, state, run } = setup();
    const id = director.spawn('cat');
    director.remove(id, 'mint');
    run(20_000);
    expect(state.npcs.has(id)).toBe(false);
  });
});

describe('cats', () => {
  it('purr with hearts when petted, then follow the petter', () => {
    const { director, events, join, state } = setup();
    const id = director.spawn('cat', { at: { x: 0, z: 0 } });
    const cat = state.npcs.get(id)!;
    const p = join('mint', { x: cat.x + 0.5, z: cat.z });
    director.pet('mint', p, id);
    expect(events.reacted).toContain('❤️');
    expect(events.said.at(-1)!.npcId).toBe(id);
  });

  it('ignore pets from too far away', () => {
    const { director, events, join } = setup();
    const id = director.spawn('cat', { at: { x: 0, z: 0 } });
    director.pet('mint', join('mint', { x: 5, z: 0 }), id);
    expect(events.reacted).toHaveLength(0);
  });
});

describe('study buddies', () => {
  it('find a seat and start focusing, then give it up for a person', () => {
    const { director, state, run } = setup();
    const id = director.spawn('buddy');
    run(30_000);
    const buddy = state.npcs.get(id)!;
    expect(buddy.seatId).not.toBe('');
    expect(buddy.status).toBe('focus');
    expect(director.seatTakenByNpc(buddy.seatId)).toBe(true);

    const seat = buddy.seatId;
    expect(director.yieldSeat(seat)).toBe(true);
    expect(buddy.seatId).not.toBe(seat);
  });

  it('cheer someone at their table who finishes a focus stretch', () => {
    const { director, state, events, join, run } = setup();
    const id = director.spawn('buddy');
    run(30_000);
    const buddy = state.npcs.get(id)!;
    const tableId = SEATS.find((s) => s.id === buddy.seatId)!.tableId;
    const neighbour = SEATS.find((s) => s.tableId === tableId && s.id !== buddy.seatId)!;
    const p = join('mint', neighbour);
    p.seatId = neighbour.id;
    director.onPlayerFocusEnded(p, 25);
    expect(events.said.at(-1)).toMatchObject({ npcId: id });
    expect(events.said.at(-1)!.text).toContain('mint');
  });
});
