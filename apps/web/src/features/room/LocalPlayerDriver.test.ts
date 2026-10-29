import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { GACHA_MACHINE, RUN_SPEED, SEATS, WALK_SPEED, type NpcView, type PlayerView } from '@study/shared';
import { LocalPlayerDriver, findHint } from './LocalPlayerDriver';
import type { StudyRoom } from './roomSession';

/** Just enough of a Colyseus room for findHint. */
function fakeRoom(players: Record<string, Partial<PlayerView>> = {}, npcs: Record<string, Partial<NpcView>> = {}) {
  return {
    sessionId: 'me',
    state: { players: new Map(Object.entries(players)), npcs: new Map(Object.entries(npcs)) },
  } as unknown as StudyRoom;
}

describe('findHint (what E does)', () => {
  const seat = SEATS[0]!;

  it('offers the nearest free seat', () => {
    expect(findHint(fakeRoom(), seat.x, seat.z)).toEqual({ kind: 'seat', seatId: seat.id });
  });

  it('skips seats someone is sitting on', () => {
    const hint = findHint(fakeRoom({ other: { seatId: seat.id } }), seat.x, seat.z);
    expect(hint?.kind === 'seat' && hint.seatId).not.toBe(seat.id);
  });

  it('opens the Buddy Machine when standing next to it', () => {
    expect(findHint(fakeRoom(), GACHA_MACHINE.x + 1, GACHA_MACHINE.z)).toEqual({ kind: 'machine' });
  });

  it('offers to pet a nearby cat, but never a study buddy', () => {
    const at = { x: GACHA_MACHINE.x + 1, z: GACHA_MACHINE.z };
    expect(findHint(fakeRoom({}, { c: { kind: 'cat', name: 'Mochi', x: at.x + 0.3, z: at.z } }), at.x, at.z)).toEqual({
      kind: 'pet',
      npcId: 'c',
      name: 'Mochi',
    });
    expect(findHint(fakeRoom({}, { b: { kind: 'buddy', name: 'Pim', x: at.x, z: at.z + 0.3 } }), at.x, at.z)?.kind).toBe('machine');
  });

  it('lets you sit even with the cat that follows you right beside the chair', () => {
    const cat = { kind: 'cat' as const, name: 'Mochi', x: seat.x + 0.2, z: seat.z, following: 'me' };
    expect(findHint(fakeRoom({}, { c: cat }), seat.x, seat.z)).toEqual({ kind: 'seat', seatId: seat.id });
  });

  it('picks whichever is closest between a cat and a seat', () => {
    const cat = { kind: 'cat' as const, name: 'Mochi', x: seat.x + 1, z: seat.z, following: '' };
    expect(findHint(fakeRoom({}, { c: cat }), seat.x + 0.1, seat.z)?.kind).toBe('seat');
    expect(findHint(fakeRoom({}, { c: cat }), seat.x + 0.95, seat.z)?.kind).toBe('pet');
  });

  it('offers the sofa too', () => {
    const sofa = SEATS.find((s) => s.kind === 'sofa')!;
    expect(findHint(fakeRoom(), sofa.out.x, sofa.out.z)).toEqual({ kind: 'seat', seatId: sofa.id });
  });

  it('offers nothing in an empty aisle', () => {
    expect(findHint(fakeRoom(), 0, 6.5)).toBeNull();
  });
});

describe('LocalPlayerDriver speed', () => {
  /** Hold some input for one second of 60 fps frames and return the metres walked. */
  function walkFor(input: (d: LocalPlayerDriver) => void) {
    const room = {
      sessionId: 'me',
      state: { players: new Map([['me', { x: 0, z: 5, yaw: 0, seatId: '', moveSeq: 0 }]]), npcs: new Map() },
      send: () => {},
    } as unknown as StudyRoom;
    const motion = { current: { x: 0, z: 5, yaw: 0, moving: false } };
    const camera = new THREE.OrthographicCamera();
    camera.position.set(20, 18, 25);
    camera.lookAt(0, 0, 5);
    const d = new LocalPlayerDriver(room, motion);
    d.frame(1 / 60, camera, null); // sync to the spawn
    input(d);
    for (let i = 0; i < 60; i++) d.frame(1 / 60, camera, null);
    return Math.hypot(motion.current.x, motion.current.z - 5);
  }

  it('walks at WALK_SPEED with a key held (not running)', () => {
    expect(walkFor((d) => d.press('KeyD'))).toBeCloseTo(WALK_SPEED, 0);
  });

  it('runs with Shift', () => {
    expect(walkFor((d) => (d.press('KeyD'), d.press('ShiftLeft')))).toBeCloseTo(RUN_SPEED, 0);
  });

  it('walks with the joystick part way, runs with it pushed all the way', () => {
    expect(walkFor((d) => d.setStick(0.6, 0))).toBeCloseTo(WALK_SPEED, 0);
    expect(walkFor((d) => d.setStick(1, 0))).toBeCloseTo(RUN_SPEED, 0);
  });
});
