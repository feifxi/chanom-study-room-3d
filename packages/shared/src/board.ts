/**
 * The whiteboard (feature 11): one shared drawing per room's board, relayed by the game server as a
 * stream of points, apart from the room state. Points are 0–1 board coordinates (across, down), so
 * every screen, the 3D wall and a saved PNG draw the same picture.
 */

export const BOARD_BG = '#fbfaf6';
export const BOARD_COLORS = ['#2b2140', '#ff5f8f', '#3d8bfd', '#12a37f', '#ef8a3c', '#7c5cff'];
/** Line widths as a share of the board's width */
export const BOARD_SIZES = [0.004, 0.009, 0.022];
/** The eraser paints the board's own colour, a bit wider */
export const BOARD_ERASER = { color: BOARD_BG, size: 0.03 };

/** Numbers (x, y, x, y…) in one `board:add`: a frame's worth of points, with room to spare */
export const BOARD_ADD_MAX = 400;
/** Numbers in one stroke: a long scribble ends there */
export const BOARD_STROKE_MAX = 8_000;
/** Numbers on the whole board: past this the oldest strokes give way, so the wall keeps drawing fast */
export const BOARD_TOTAL_MAX = 400_000;

/** A stroke as the server relays it */
export interface BoardStroke {
  /** The drawer's session id and their own stroke number: `<sessionId>:<n>` */
  id: string;
  color: string;
  size: number;
  /** x0, y0, x1, y1, … in 0–1 */
  pts: number[];
}

/** Whether a pen is one the board offers (a colour and size from the tools, or the eraser) */
export function boardPen(color: string, size: number) {
  return (BOARD_COLORS.includes(color) && BOARD_SIZES.includes(size)) || (color === BOARD_ERASER.color && size === BOARD_ERASER.size);
}

/**
 * Messages. A client at the board sends `board:start` { n, color, size, pts }, `board:add` { n, pts },
 * `board:undo` (your own last stroke) and `board:clear`; any client sends `board:sync` to get the
 * whole board. The server sends the others `board:start` (a {@link BoardStroke}) and `board:add`
 * { id, pts }, and everyone `board:undo` { id }, `board:clear` and, to whoever asked,
 * `board:all` { strokes }.
 */
export interface BoardAdd {
  id: string;
  pts: number[];
}
