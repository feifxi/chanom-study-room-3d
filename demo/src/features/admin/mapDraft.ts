import { KIT, type KitId, type MapSize } from '@/lib/mock';

/**
 * The admin map editor's model (feature 7). A map file is a list of pieces and zones on a metre
 * grid; the standard-kit check runs on it before Publish. Coordinates here start at the top-left
 * corner; the real map file stores them centred like `ROOM` in @study/shared.
 */

export interface CatalogPiece {
  kind: string;
  name: string;
  emoji: string;
  /** Footprint in metres before rotating. */
  w: number;
  d: number;
  /** Which standard-kit item it counts towards, if any. */
  kit?: KitId;
  /** Study seats it adds. */
  seats?: number;
  /** Where the model comes from: V1's code-built pieces, or a CC0 pack. */
  source: 'Built-in' | 'Kenney Furniture Kit (CC0)' | 'Quaternius Cosy Pack (CC0)';
}

export const CATALOG: CatalogPiece[] = [
  { kind: 'study-table', name: 'Study table (4 seats)', emoji: '📗', w: 2.4, d: 1.6, kit: 'study', seats: 4, source: 'Built-in' },
  { kind: 'sofa', name: 'Sofa', emoji: '🛋️', w: 1.2, d: 3, kit: 'lounge', source: 'Built-in' },
  { kind: 'bookshelf', name: 'Bookshelf', emoji: '📚', w: 3, d: 0.6, source: 'Built-in' },
  { kind: 'buddy', name: 'Buddy Machine', emoji: '🤖', w: 1, d: 1, kit: 'buddy', source: 'Built-in' },
  { kind: 'plant', name: 'Plant', emoji: '🪴', w: 0.6, d: 0.6, source: 'Built-in' },
  { kind: 'spawn', name: 'Spawn point', emoji: '🚪', w: 1, d: 1, kit: 'spawn', source: 'Built-in' },
  {
    kind: 'cafe-table',
    name: 'Café table (2 seats)',
    emoji: '☕',
    w: 1.2,
    d: 1.2,
    kit: 'study',
    seats: 2,
    source: 'Kenney Furniture Kit (CC0)',
  },
  { kind: 'desk', name: 'Single desk', emoji: '🪑', w: 1.2, d: 0.8, kit: 'study', seats: 1, source: 'Kenney Furniture Kit (CC0)' },
  { kind: 'tv', name: 'Big screen', emoji: '📺', w: 2.4, d: 0.4, kit: 'screen', source: 'Kenney Furniture Kit (CC0)' },
  { kind: 'game-table', name: 'Card table', emoji: '🃏', w: 1.6, d: 1.6, kit: 'games', source: 'Kenney Furniture Kit (CC0)' },
  { kind: 'whiteboard', name: 'Whiteboard', emoji: '🖍️', w: 1.8, d: 0.4, kit: 'whiteboard', source: 'Kenney Furniture Kit (CC0)' },
  { kind: 'beanbag', name: 'Beanbag', emoji: '🫘', w: 0.9, d: 0.9, kit: 'lounge', source: 'Quaternius Cosy Pack (CC0)' },
  { kind: 'cat-bed', name: 'Cat bed', emoji: '🧺', w: 0.8, d: 0.8, kit: 'nap', source: 'Quaternius Cosy Pack (CC0)' },
  { kind: 'cat-tower', name: 'Cat tower', emoji: '🐈', w: 1, d: 1, kit: 'nap', source: 'Quaternius Cosy Pack (CC0)' },
  { kind: 'lamp', name: 'Floor lamp', emoji: '💡', w: 0.5, d: 0.5, source: 'Quaternius Cosy Pack (CC0)' },
];

export const pieceOf = (kind: string) => CATALOG.find((c) => c.kind === kind)!;

export interface Placed {
  id: string;
  kind: string;
  x: number;
  z: number;
  /** Quarter turns. */
  rot: 0 | 1 | 2 | 3;
}

export type ZoneKind = 'private' | 'floor';
export interface Zone {
  id: string;
  name: string;
  kind: ZoneKind;
  x: number;
  z: number;
  w: number;
  d: number;
}

export interface Draft {
  pieces: Placed[];
  zones: Zone[];
}

export const MAP_DIMENSIONS: Record<MapSize, { w: number; d: number; seats: number }> = {
  cosy: { w: 26, d: 18, seats: 12 },
  big: { w: 34, d: 24, seats: 24 },
};

/** The footprint after rotating: a quarter turn swaps width and depth. */
export function footprint(p: Placed) {
  const c = pieceOf(p.kind);
  return p.rot % 2 ? { w: c.d, d: c.w } : { w: c.w, d: c.d };
}

let next = 0;
export const newId = (prefix: string) => `${prefix}-${++next}`;

const at = (kind: string, x: number, z: number, rot: Placed['rot'] = 0): Placed => ({ id: newId(kind), kind, x, z, rot });

/** A cosy layout with the whole kit: what the Library ships with. */
function fullLayout(): Draft {
  return {
    pieces: [
      ...[2.2, 5.6, 9].flatMap((x) => [at('study-table', x, 3.4), at('study-table', x, 7.2)]),
      at('bookshelf', 1, 0.2),
      at('bookshelf', 15.5, 0.2),
      at('sofa', 0.4, 9.6),
      at('beanbag', 2.4, 10.2),
      at('cat-bed', 2.2, 12.6),
      at('buddy', 18.6, 11.8),
      at('tv', 13.8, 2.6),
      at('game-table', 15.6, 9.4),
      at('whiteboard', 9.4, 0.2),
      at('spawn', 9.5, 12.8),
      at('plant', 0.2, 0.3),
      at('lamp', 19.2, 0.4),
    ],
    zones: [
      { id: newId('zone'), name: 'Fireside', kind: 'private', x: 0.2, z: 9.2, w: 4.2, d: 4.6 },
      { id: newId('zone'), name: 'Card corner', kind: 'private', x: 14.8, z: 8.6, w: 3.4, d: 3.2 },
      { id: newId('zone'), name: 'Open floor', kind: 'floor', x: 6.4, z: 9.8, w: 6, d: 2.6 },
    ],
  };
}

/** Each template's draft. The Cat Café draft is mid-edit: no big screen yet and one booth short. */
export function initialDrafts(): Record<string, Draft> {
  const cafe = fullLayout();
  cafe.pieces = cafe.pieces
    .filter((p) => p.kind !== 'tv')
    .map((p) => (p.kind === 'study-table' ? { ...p, kind: 'cafe-table' } : p.kind === 'sofa' ? { ...p, kind: 'cat-tower' } : p));
  cafe.zones = cafe.zones.filter((z) => z.name !== 'Card corner').map((z) => (z.name === 'Fireside' ? { ...z, name: 'Window booth' } : z));
  return { library: fullLayout(), cafe, rooftop: fullLayout() };
}

export interface KitRow {
  id: KitId;
  name: string;
  need: string;
  ok: boolean;
  /** What's there now, e.g. "8 / 12 seats". */
  have: string;
}

/** The standard-kit check (Publish stays off until every row passes). */
export function checkKit(draft: Draft, size: MapSize): KitRow[] {
  const count = (kit: KitId) => draft.pieces.filter((p) => pieceOf(p.kind).kit === kit).length;
  const seats = draft.pieces.reduce((n, p) => n + (pieceOf(p.kind).seats ?? 0), 0);
  const privateZones = draft.zones.filter((z) => z.kind === 'private').length;
  const floor = Math.max(0, ...draft.zones.filter((z) => z.kind === 'floor').map((z) => z.w * z.d));
  const hasSpawn = draft.pieces.some((p) => p.kind === 'spawn');
  const needSeats = MAP_DIMENSIONS[size].seats;
  return KIT.map((k): KitRow => {
    const row = (ok: boolean, have: string) => ({ id: k.id, name: k.name, need: k.need, ok, have });
    switch (k.id) {
      case 'study':
        return row(seats >= needSeats, `${seats} / ${needSeats} seats`);
      case 'private':
        return row(privateZones >= 2, `${privateZones} / 2 zones`);
      case 'floor':
        return row(floor >= 12, floor ? `${Math.round(floor)} m² (12+)` : 'none');
      case 'spawn':
        return row(hasSpawn, hasSpawn ? 'placed' : 'none');
      default: {
        const n = count(k.id);
        return row(n > 0, n ? `${n} placed` : 'none');
      }
    }
  });
}

export interface MapVersion {
  version: number;
  when: string;
  note: string;
}

export const VERSIONS: Record<string, MapVersion[]> = {
  library: [
    { version: 3, when: '2026-11-02', note: 'Second private zone by the map shelf' },
    { version: 2, when: '2026-10-21', note: 'Buddy Machine moved by the door' },
    { version: 1, when: '2026-10-01', note: 'From V1' },
  ],
  cafe: [
    { version: 2, when: '2026-11-05', note: 'More cat beds' },
    { version: 1, when: '2026-10-28', note: 'First version' },
  ],
  rooftop: [{ version: 1, when: '2026-11-01', note: 'First version' }],
};
