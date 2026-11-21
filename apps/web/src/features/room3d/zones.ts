import { activeMap } from '../map/active';
import { zoneAtIn, type Zone } from '../map/types';

/**
 * Private zones live in the map (`features/map/*.ts`): only the people inside hear each other,
 * nobody outside hears in, no locks (feature 6). `zoneAt` asks the map the room is in.
 */
export type { Zone };
export const zoneAt = (x: number, z: number): Zone | undefined => zoneAtIn(activeMap(), x, z);
