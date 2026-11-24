/**
 * Watch together (docs/features/09-watch-and-photo.md): YouTube on the big screen, in
 * sync for everyone on its rug. The game server keeps the timeline and Up next; each browser plays
 * the video itself and seeks back in line when it drifts.
 */

/** Up next holds at most this many videos */
export const WATCH_QUEUE_MAX = 20;
/** Nobody on the rug for this long: the screen turns off and Up next clears */
export const EMPTY_SCREEN_MS = 30_000;
/** A player more than this many seconds off the shared timeline seeks back in line */
export const WATCH_DRIFT_S = 2;
export const VIDEO_TITLE_MAX = 200;

/** The video id from a youtube.com / youtu.be / Shorts / live link, or a bare id */
export function parseYouTube(input: string): string | null {
  const s = input.trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  const m = s.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/);
  return m?.[1] ?? null;
}

/** One video on the screen or in Up next. `key` tells two adds of the same video apart. */
export interface WatchVideo {
  key: string;
  videoId: string;
  title: string;
  /** Who put it on: their session id (it may have left) and name */
  by: string;
  byName: string;
}

/**
 * The screen as clients read it (room state `watch`): what's on, where it was at `startedAt`
 * (`offset`, seconds) and whether it's paused. A screen share on the TV is the sharer's player
 * (`share: 'tv'`) and takes over: the video pauses and carries on after.
 */
export interface WatchView extends Omit<WatchVideo, 'key' | 'videoId'> {
  key: string;
  /** '' when nothing's on */
  videoId: string;
  offset: number;
  /** Server epoch ms */
  startedAt: number;
  paused: boolean;
  queue: Iterable<WatchVideo>;
}

/** Where a video is now on the shared timeline, in seconds */
export const watchPosition = (w: { offset: number; startedAt: number; paused: boolean }, now = Date.now()) =>
  w.paused ? w.offset : w.offset + (now - w.startedAt) / 1000;

/** Why a link wasn't put on (sent as `watch:refused`) */
export type WatchRefused = { reason: 'link' | 'unavailable' | 'full' | 'away' };
