/**
 * Private zones: areas of a map where only the people inside hear each other (voice at full volume
 * however far apart, bubbles stay inside). Nobody outside hears in. No locks: anyone can walk in, like
 * a real café table. Part of the map file once maps are data (feature 7); the demo's library has one.
 */
export interface Zone {
  id: string;
  name: string;
  emoji: string;
  x: number;
  z: number;
  r: number;
}

export const ZONES: Zone[] = [{ id: 'nook', name: 'Reading nook', emoji: '🛋️', x: -7.6, z: 4.1, r: 2.5 }];

export const zoneAt = (x: number, z: number): Zone | undefined => ZONES.find((zn) => Math.hypot(x - zn.x, z - zn.z) <= zn.r);
