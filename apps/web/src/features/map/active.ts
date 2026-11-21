import { Cafe } from '../room3d/Cafe';
import { Library } from '../room3d/Library';
import { Rooftop } from '../room3d/Rooftop';
import { CAFE } from './cafe';
import { LIBRARY } from './library';
import { ROOFTOP } from './rooftop';
import type { MapDef } from './types';

/**
 * The map the room is in. RoomView sets it from the room's look before it builds the mock room, and
 * everything else (driver, hub, scene, labels) reads it when it needs it, so a live map change
 * (feature 7) swaps every piece at once. Unknown templates fall back to the library.
 *
 * The data files don't import their scenes (the scenes import the data, and a cycle there trips the
 * module loader), so the two halves meet here.
 */
let defs: Record<string, MapDef> | null = null;
const all = (): Record<string, MapDef> =>
  (defs ??= {
    library: { ...LIBRARY, Scene: Library },
    cafe: { ...CAFE, Scene: Cafe },
    rooftop: { ...ROOFTOP, Scene: Rooftop },
  });

let active: MapDef | null = null;

export const activeMap = (): MapDef => (active ??= all().library!);
export const mapDefFor = (mapId: string): MapDef => all()[mapId] ?? all().library!;
export function setActiveMap(mapId: string) {
  active = mapDefFor(mapId);
  return active;
}
/** Which templates have a 3D build (the rest show the library). */
export const isBuiltMap = (mapId: string) => mapId in all();
