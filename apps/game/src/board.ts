import { BOARD_STROKE_MAX, BOARD_TOTAL_MAX, boardPen, type BoardStroke } from '@connecta/shared';

/**
 * The room's whiteboard (docs/features/10-party-games.md): the strokes, kept in memory with the room, so newcomers get
 * the board as it is. Nothing is stored; the board goes when the room empties or the map changes.
 * Each stroke belongs to its drawer's account, so Undo takes back only your own, even after a reload.
 */
export class Board {
  private strokes: (BoardStroke & { userId: string })[] = [];
  private total = 0;

  /** `dropped`: a very full board let an old stroke go (everyone's copy should drop it too) */
  constructor(private readonly dropped: (id: string) => void) {}

  all(): BoardStroke[] {
    return this.strokes.map(({ id, color, size, pts }) => ({ id, color, size, pts }));
  }

  /** A new stroke; null when it's refused (a pen the board doesn't have, or points off the board) */
  start(sessionId: string, userId: string, n: number, color: string, size: number, pts: number[]): BoardStroke | null {
    if (!boardPen(color, size) || !points(pts)) return null;
    const id = `${sessionId}:${n}`;
    if (this.strokes.some((s) => s.id === id)) return null;
    const stroke = { id, userId, color, size, pts: [...pts] };
    this.strokes.push(stroke);
    this.total += pts.length;
    this.trim();
    return { id, color, size, pts };
  }

  /** More points on your own stroke; null when refused (not yours, too long, off the board) */
  add(sessionId: string, n: number, pts: number[]): { id: string; pts: number[] } | null {
    const id = `${sessionId}:${n}`;
    const s = this.strokes.find((x) => x.id === id);
    if (!s || !points(pts) || s.pts.length + pts.length > BOARD_STROKE_MAX) return null;
    s.pts.push(...pts);
    this.total += pts.length;
    this.trim();
    return { id, pts };
  }

  /** Your own last stroke goes; returns its id */
  undo(userId: string): string | null {
    let i = this.strokes.length - 1;
    while (i >= 0 && this.strokes[i]!.userId !== userId) i--;
    if (i < 0) return null;
    const [s] = this.strokes.splice(i, 1);
    this.total -= s!.pts.length;
    return s!.id;
  }

  /** Returns whether there was anything to clear */
  clear() {
    const had = this.strokes.length > 0;
    this.strokes = [];
    this.total = 0;
    return had;
  }

  /** A very full board drops its oldest strokes (everyone's copy does the same on their next sync) */
  private trim() {
    while (this.total > BOARD_TOTAL_MAX && this.strokes.length > 1) {
      const s = this.strokes.shift()!;
      this.total -= s.pts.length;
      this.dropped(s.id);
    }
  }
}

/** Pairs of 0–1 numbers */
function points(pts: number[]) {
  return pts.length > 0 && pts.length % 2 === 0 && pts.every((v) => Number.isFinite(v) && v >= 0 && v <= 1);
}
