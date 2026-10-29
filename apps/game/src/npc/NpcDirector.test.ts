import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DESK_SEATS, GACHA_MACHINE, NPC_LIMITS, SEATS, SUMMON_COOLDOWN_MS, SUMMON_REVEAL_MS, type NpcSummoned } from '@study/shared';
import { Player, StudyState } from '../state';
import { pickFreeSeat } from './buddy';
import { NpcDirector } from './NpcDirector';

/** A director wired to a fake room that records everything it would broadcast. */
function setup() {
  const state = new StudyState();
  const events = {
    said: [] as { npcId: string; text: string }[],
    reacted: [] as string[],
    announced: [] as string[],
    summoned: [] as NpcSummoned[],
  };
  const director = new NpcDirector({
    state,
    say: (npcId, text) => events.said.push({ npcId, text }),
    react: (_id, emote) => events.reacted.push(emote),
    announce: (text) => events.announced.push(text),
    summoned: (e) => events.summoned.push(e),
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

describe('summoning', () => {
  it('refuses summons from across the room', () => {
    const { director, join } = setup();
    expect(director.summon('mint', join('mint', { x: 0, z: 0 }), 'cat')).toMatch(/walk up/i);
  });

  it('plays the capsule first, then reveals the NPC and announces it', () => {
    const { director, join, state, events, run } = setup();
    director.summon('mint', join('mint'), 'cat');
    expect(events.summoned).toHaveLength(1);
    expect(state.npcs.size).toBe(0);
    run(SUMMON_REVEAL_MS + 100);
    expect(state.npcs.has(events.summoned[0]!.npcId)).toBe(true);
    expect(events.announced.at(-1)).toMatch(/mint summoned an? .*cat/);
  });

  it('enforces the per-person cooldown', () => {
    const { director, join, run } = setup();
    const p = join('mint');
    expect(director.summon('mint', p, 'cat')).toBeNull();
    expect(director.summon('mint', p, 'cat')).toMatch(/cooling down/);
    run(SUMMON_COOLDOWN_MS);
    expect(director.summon('mint', p, 'cat')).toBeNull();
  });

  it('caps NPCs per kind, counting capsules still rolling out', () => {
    const { director, join } = setup();
    for (let i = 0; i < NPC_LIMITS.cat; i++) expect(director.summon(`p${i}`, join(`p${i}`), 'cat')).toBeNull();
    expect(director.summon('extra', join('extra'), 'cat')).toMatch(/plenty of cats/);
    expect(director.summon('extra', join('extra'), 'buddy')).toBeNull();
  });

  it('walks an NPC back into the machine on goodbye', () => {
    const { director, state, events, run } = setup();
    const id = director.spawn('cat', { name: 'Mochi' });
    director.remove(id, 'mint');
    expect(events.announced.at(-1)).toBe('👋 mint said goodbye to Mochi');
    run(20_000);
    expect(state.npcs.has(id)).toBe(false);
  });
});

describe('cats', () => {
  it('purr with hearts when petted, then follow the petter', () => {
    const { director, events, join, state } = setup();
    const id = director.spawn('cat', { at: { x: 0, z: 0 } });
    const cat = state.npcs.get(id)!;
    director.pet('mint', join('mint', { x: cat.x + 0.5, z: cat.z }), id);
    expect(events.reacted).toContain('❤️');
    expect(cat.following).toBe('mint');
  });

  it('ignore pets from too far away', () => {
    const { director, events, join } = setup();
    const id = director.spawn('cat', { at: { x: 0, z: 0 } });
    director.pet('mint', join('mint', { x: 5, z: 0 }), id);
    expect(events.reacted).toHaveLength(0);
  });

  it('stop following as soon as the person sits down', () => {
    const { director, join, state, run } = setup();
    const id = director.spawn('cat', { at: { x: 0, z: 0 } });
    const p = join('mint', { x: 0.5, z: 0 });
    director.pet('mint', p, id);
    run(500);
    expect(state.npcs.get(id)!.following).toBe('mint');
    p.seatId = SEATS[0]!.id;
    run(200);
    expect(state.npcs.get(id)!.following).toBe('');
  });
});

describe('study buddies', () => {
  it('find a desk seat and start focusing, then give it up for a person', () => {
    const { director, state, run } = setup();
    const id = director.spawn('buddy');
    run(30_000);
    const buddy = state.npcs.get(id)!;
    expect(DESK_SEATS.some((s) => s.id === buddy.seatId)).toBe(true);
    expect(buddy.status).toBe('focus');

    const seat = buddy.seatId;
    expect(director.yieldSeat(seat)).toBe(true);
    expect(buddy.seatId).not.toBe(seat);
  });

  it('pick free seats uniformly, never the sofa or a taken one', () => {
    const taken = new Set([DESK_SEATS[0]!.id, DESK_SEATS[1]!.id]);
    const counts = new Map<string, number>();
    for (let i = 0; i < 22_000; i++) {
      const seat = pickFreeSeat(taken)!;
      counts.set(seat.id, (counts.get(seat.id) ?? 0) + 1);
    }
    expect([...counts.keys()].some((id) => taken.has(id) || id.startsWith('sofa'))).toBe(false);
    expect(counts.size).toBe(DESK_SEATS.length - taken.size);
    // ~1000 each; a seat-hogging bias would push some far off
    for (const n of counts.values()) expect(n).toBeGreaterThan(800);
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
