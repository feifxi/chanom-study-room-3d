import { describe, expect, it } from 'vitest';
import { GACHA_MACHINE, SEATS, type NpcView, type PlayerView } from '@study/shared';
import { findHint } from './LocalPlayerDriver';
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
