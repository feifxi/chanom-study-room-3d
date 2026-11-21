/**
 * The whiteboard (feature 11): one shared drawing per board. Strokes are in board coordinates
 * (0–1 across, 0–1 down), so the panel, the 3D wall and a saved PNG all draw the same picture.
 *
 * It has its own little store, apart from the activity hub: strokes change on every pointer move,
 * and only the board's canvases need to redraw, not the whole room's UI. (The server relays strokes
 * the same way: a stream of points, apart from the room state.)
 */

export interface Stroke {
  id: string;
  by: string;
  color: string;
  /** Line width as a share of the board's width. */
  size: number;
  /** x0, y0, x1, y1, … in 0–1. */
  pts: number[];
}

export const BOARD_BG = '#fbfaf6';
export const COLORS = ['#2b2140', '#ff5f8f', '#3d8bfd', '#12a37f', '#ef8a3c', '#7c5cff'];
export const SIZES = [0.004, 0.009, 0.022];
/** The eraser paints the board's own colour, a bit wider. */
export const ERASER = { color: BOARD_BG, size: 0.03 };
export const ASPECT = 16 / 9;

export class BoardStore {
  strokes: Stroke[] = [];
  rev = 0;
  private listeners = new Set<() => void>();

  subscribe = (l: () => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };
  getRev = () => this.rev;

  private bump() {
    this.rev++;
    this.listeners.forEach((l) => l());
  }

  start(s: Stroke) {
    this.strokes.push(s);
    this.bump();
  }

  add(id: string, pts: number[]) {
    const s = this.strokes.findLast((x) => x.id === id);
    if (!s) return;
    s.pts.push(...pts);
    this.bump();
  }

  /** Undo takes back your own last stroke, never someone else's. */
  undo(by: string) {
    const i = this.strokes.findLastIndex((s) => s.by === by);
    if (i < 0) return false;
    this.strokes.splice(i, 1);
    this.bump();
    return true;
  }

  clear() {
    if (!this.strokes.length) return;
    this.strokes = [];
    this.bump();
  }
}

/** Draw the board into a 2D context of any size. */
export function drawBoard(g: CanvasRenderingContext2D, strokes: Stroke[], w: number, h: number) {
  g.fillStyle = BOARD_BG;
  g.fillRect(0, 0, w, h);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  for (const s of strokes) {
    const p = s.pts;
    if (p.length < 2) continue;
    g.strokeStyle = s.color;
    g.fillStyle = s.color;
    g.lineWidth = s.size * w;
    if (p.length === 2) {
      // A tap is a dot
      g.beginPath();
      g.arc(p[0]! * w, p[1]! * h, (s.size * w) / 2, 0, Math.PI * 2);
      g.fill();
      continue;
    }
    g.beginPath();
    g.moveTo(p[0]! * w, p[1]! * h);
    for (let i = 2; i < p.length; i += 2) g.lineTo(p[i]! * w, p[i + 1]! * h);
    g.stroke();
  }
}

/** The board as a PNG (for Save and Share). */
export function boardPng(strokes: Stroke[]): Promise<Blob | null> {
  const c = document.createElement('canvas');
  c.width = 1600;
  c.height = 900;
  drawBoard(c.getContext('2d')!, strokes, c.width, c.height);
  return new Promise((r) => c.toBlob(r, 'image/png'));
}

// --- Demo: a doodle someone else draws, as strokes to play back a few points at a time ---

const circle = (cx: number, cy: number, rx: number, ry: number, from = 0, to = Math.PI * 2, n = 40) =>
  Array.from({ length: n + 1 }, (_, i) => {
    const a = from + ((to - from) * i) / n;
    return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry];
  }).flat();

/** A cat face and a heart, in board coordinates. */
export function catDoodle(): { color: string; size: number; pts: number[] }[] {
  const ink = COLORS[0]!;
  const heart = Array.from({ length: 50 }, (_, i) => {
    const t = (i / 49) * Math.PI * 2;
    const x = 16 * Math.sin(t) ** 3;
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    return [0.74 + x * 0.006, 0.42 - y * 0.0105];
  }).flat();
  return [
    { color: ink, size: SIZES[1]!, pts: circle(0.38, 0.55, 0.15, 0.26) },
    { color: ink, size: SIZES[1]!, pts: [0.26, 0.4, 0.27, 0.16, 0.34, 0.31] },
    { color: ink, size: SIZES[1]!, pts: [0.42, 0.31, 0.49, 0.16, 0.5, 0.4] },
    { color: ink, size: SIZES[2]!, pts: [0.33, 0.52] },
    { color: ink, size: SIZES[2]!, pts: [0.43, 0.52] },
    { color: COLORS[1]!, size: SIZES[1]!, pts: [0.37, 0.6, 0.38, 0.62, 0.39, 0.6] },
    { color: ink, size: SIZES[0]!, pts: [0.29, 0.6, 0.19, 0.58] },
    { color: ink, size: SIZES[0]!, pts: [0.29, 0.64, 0.19, 0.67] },
    { color: ink, size: SIZES[0]!, pts: [0.47, 0.6, 0.57, 0.58] },
    { color: ink, size: SIZES[0]!, pts: [0.47, 0.64, 0.57, 0.67] },
    { color: COLORS[1]!, size: SIZES[2]!, pts: heart },
  ];
}
