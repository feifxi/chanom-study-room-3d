import { describe, expect, it } from 'vitest';
import { GACHA_MACHINE, SEATS, isWalkable, type NpcView, type PlayerView } from '@study/shared';
import { goalReached, pickTapTarget, planRoute, routeLength } from './tapToWalk';
import type { StudyRoom } from './roomSession';

function fakeRoom(players: Record<string, Partial<PlayerView>> = {}, npcs: Record<string, Partial<NpcView>> = {}) {
  return {
    sessionId: 'me',
    state: { players: new Map(Object.entries({ me: { x: 0, z: 5, seatId: '' }, ...players })), npcs: new Map(Object.entries(npcs)) },
  } as unknown as StudyRoom;
}

describe('pickTapTarget', () => {
  const seat = SEATS[0]!;

  it('a tap on open floor is a walk to that spot', () => {
    expect(pickTapTarget(fakeRoom(), { x: 1, z: 6 })).toEqual({ x: 1, z: 6, goal: { kind: 'walk' } });
  });

  it('a tap on a free chair means sit there', () => {
    expect(pickTapTarget(fakeRoom(), { x: seat.x + 0.2, z: seat.z }).goal).toEqual({ kind: 'seat', seatId: seat.id });
  });

  it('ignores chairs that are taken, so you just walk there', () => {
    expect(pickTapTarget(fakeRoom({ other: { seatId: seat.id } }), { x: seat.x, z: seat.z }).goal).not.toEqual({
      kind: 'seat',
      seatId: seat.id,
    });
  });

  it('a tap on a cat means pet it, even next to a chair', () => {
    const room = fakeRoom({}, { c1: { kind: 'cat', x: seat.x + 0.3, z: seat.z } });
    expect(pickTapTarget(room, { x: seat.x + 0.25, z: seat.z }).goal).toEqual({ kind: 'pet', npcId: 'c1' });
  });

  it('never offers to pet a study buddy', () => {
    const room = fakeRoom({}, { b1: { kind: 'buddy', x: 2, z: 6 } });
    expect(pickTapTarget(room, { x: 2, z: 6 }).goal).toEqual({ kind: 'walk' });
  });

  it('a tap on the Buddy Machine opens it on arrival', () => {
    expect(pickTapTarget(fakeRoom(), { x: GACHA_MACHINE.x + 0.3, z: GACHA_MACHINE.z }).goal).toEqual({ kind: 'machine' });
  });
});

describe('routes', () => {
  it('goes around furniture and ends somewhere walkable', () => {
    const seat = SEATS[0]!;
    const path = planRoute({ x: 0, z: 5 }, seat);
    expect(path.length).toBeGreaterThan(0);
    expect(isWalkable(path.at(-1)!)).toBe(true);
    expect(routeLength({ x: 0, z: 5 }, path)).toBeGreaterThanOrEqual(Math.hypot(seat.x, seat.z - 5) - 1);
  });

  it('knows when a goal is in reach', () => {
    const seat = SEATS[0]!;
    const room = fakeRoom();
    expect(goalReached(room, { kind: 'seat', seatId: seat.id }, { x: seat.x + 0.5, z: seat.z })).toBe(true);
    expect(goalReached(room, { kind: 'seat', seatId: seat.id }, { x: seat.x + 4, z: seat.z })).toBe(false);
    expect(goalReached(room, { kind: 'walk' }, { x: 0, z: 0 })).toBe(false);
    // Stopped short by someone in the way: still close enough for the server to allow sitting
    expect(goalReached(room, { kind: 'seat', seatId: seat.id }, { x: seat.x + 1.45, z: seat.z })).toBe(false);
    expect(goalReached(room, { kind: 'seat', seatId: seat.id }, { x: seat.x + 1.45, z: seat.z }, 0.95)).toBe(true);
  });
});
