import type { ReactNode } from 'react';
import type { MapData } from '@connecta/shared/maps';
import type { DayLight } from '../room3d/dayCycle';

/**
 * What a map is, to the room code (docs/features/06-maps.md). The data half (the walkable world, seats, zones, the
 * kit's places) lives in `@connecta/shared/maps`, so the game server reads the same map; the web app
 * adds the 3D look. `active.ts` says which one the room is in.
 */
export * from '@connecta/shared/maps/types';

export interface MapDef extends MapData {
  /** The 3D look. */
  Scene: (props: { light: DayLight; shadows?: boolean }) => ReactNode;
}
