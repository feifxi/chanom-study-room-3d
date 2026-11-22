import { CAFE } from './cafe.js';
import { LIBRARY } from './library.js';
import { ROOFTOP } from './rooftop.js';
import type { MapData } from './types.js';

export * from './types.js';

/** Every template with a build; unknown ones fall back to the library (as the web app does). */
export const MAP_DATA: Record<string, MapData> = { library: LIBRARY, cafe: CAFE, rooftop: ROOFTOP };
export const mapDataFor = (mapId: string): MapData => MAP_DATA[mapId] ?? LIBRARY;
