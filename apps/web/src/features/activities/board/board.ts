/**
 * The whiteboard (feature 11): one shared drawing per board. Strokes are in board coordinates
 * (0–1 across, 0–1 down), so the panel, the 3D wall and a saved PNG all draw the same picture.
 *
 * It has its own little store, apart from the activity hub: strokes change on every pointer move,
 * and only the board's canvases need to redraw, not the whole room's UI. The game server relays
 * strokes the same way, a stream of points apart from the room state: your strokes
 * draw at once and go out through {@link BoardSink}; everyone else's come in through `put`,
 * `extend`, `remove`, `wipe` and `replace`.
 */

import { BOARD_BG, BOARD_COLORS, BOARD_ERASER, BOARD_SIZES, BOARD_STROKE_MAX, type BoardStroke } from '@connecta/shared';

/** The way to the game server's board (`LiveRoom.connectBoard`) */
export interface BoardSink {
  /** Your session id: your strokes are `<sessionId>:<n>` on every screen */
  sessionId: string;
  start(n: number, color: string, size: number, pts: number[]): void;
  add(n: number, pts: number[]): void;
  undo(): void;
  clear(): void;
}

export interface Stroke {
  id: string;
  by: string;
  color: string;
  /** Line width as a share of the board's width. */
  size: number;
  /** x0, y0, x1, y1, … in 0–1. */
  pts: number[];
}

export { BOARD_BG };
export const COLORS = BOARD_COLORS;
export const SIZES = BOARD_SIZES;
/** The eraser paints the board's own colour, a bit wider. */
export const ERASER = BOARD_ERASER;
export const ASPECT = 16 / 9;

export class BoardStore {
  strokes: Stroke[] = [];
  rev = 0;
  /** The game server's board, once connected */
  remote: BoardSink | null = null;
  /** Your strokes' numbers for the server, by the panel's stroke id */
  private mine = new Map<string, number>();
  private count = 0;
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
    if (this.remote) {
      const n = ++this.count;
      this.mine.set(s.id, n);
      this.remote.start(n, s.color, s.size, s.pts);
      s = { ...s, id: `${this.remote.sessionId}:${n}` };
    }
    this.strokes.push(s);
    this.bump();
  }

  add(id: string, pts: number[]) {
    const n = this.mine.get(id);
    if (this.remote && n) id = `${this.remote.sessionId}:${n}`;
    const s = this.strokes.findLast((x) => x.id === id);
    // A very long scribble ends there (the server takes no more of it either)
    if (!s || s.pts.length + pts.length > BOARD_STROKE_MAX) return;
    s.pts.push(...pts);
    if (this.remote && n) this.remote.add(n, pts);
    this.bump();
  }

  /** Undo takes back your own last stroke, never someone else's. */
  undo(by: string) {
    // The server knows which is yours (even from before a reload) and tells everyone
    if (this.remote) return (this.remote.undo(), true);
    const i = this.strokes.findLastIndex((s) => s.by === by);
    if (i < 0) return false;
    this.strokes.splice(i, 1);
    this.bump();
    return true;
  }

  clear() {
    if (this.remote) return this.remote.clear();
    this.wipe();
  }

  // --- From the game server ---

  /** Someone else's new stroke */
  put(s: BoardStroke) {
    this.strokes.push({ ...s, by: s.id.split(':')[0]! });
    this.bump();
  }

  /** More of someone else's stroke */
  extend(id: string, pts: number[]) {
    const s = this.strokes.findLast((x) => x.id === id);
    if (!s) return;
    s.pts.push(...pts);
    this.bump();
  }

  remove(id: string) {
    const i = this.strokes.findIndex((s) => s.id === id);
    if (i < 0) return;
    this.strokes.splice(i, 1);
    this.bump();
  }

  wipe() {
    if (!this.strokes.length) return;
    this.strokes = [];
    this.bump();
  }

  /** The whole board, when you arrive */
  replace(strokes: BoardStroke[]) {
    this.strokes = strokes.map((s) => ({ ...s, by: s.id.split(':')[0]! }));
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
