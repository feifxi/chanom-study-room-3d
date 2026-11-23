import { EMPTY_SCREEN_MS, VIDEO_TITLE_MAX, WATCH_QUEUE_MAX, watchPosition } from '@connecta/shared';
import { log } from './log.js';
import { Video, type Watch } from './state.js';

/**
 * Looks a video up with YouTube's oEmbed (free, no key) before anyone's screen gets it: a missing,
 * private or not-embeddable video is refused, and the title is YouTube's, not whatever a client
 * sends. Tests swap `youtube.lookup`.
 */
export const youtube = {
  async lookup(videoId: string): Promise<{ title: string } | null> {
    const url = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}`;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      // 401/403: embedding turned off; 400/404: no such video, or private
      if (!res.ok) return null;
      const body = (await res.json()) as { title?: unknown };
      return { title: typeof body.title === 'string' && body.title ? body.title : 'YouTube video' };
    } catch (err) {
      // YouTube unreachable from here: let it through, the players will show YouTube's own message
      log.warn({ err: (err as Error).message, videoId }, 'oembed lookup failed');
      return { title: 'YouTube video' };
    }
  },
};

let keys = 0;

/**
 * The big screen's rules (feature 10). The schema is what clients see; the rest is bookkeeping.
 * A screen share on the TV (a player's `share: 'tv'`) takes over: the video pauses and carries on
 * when it ends. Nobody on the rug for 30 s: the screen turns off and Up next clears.
 */
export class Tv {
  /** A share is on; the video was playing when it began, so it plays again after */
  private sharing = false;
  private resume = false;
  private lastWatched = 0;

  constructor(readonly state: Watch) {}

  get on() {
    return !!this.state.videoId;
  }

  /** Plays now if nothing's on (and nobody's sharing), otherwise joins Up next. False when Up next is full. */
  add(video: { videoId: string; title: string; by: string; byName: string }, now: number): boolean {
    const v = new Video({ ...video, title: video.title.slice(0, VIDEO_TITLE_MAX), key: `v${++keys}` });
    if (!this.on && !this.sharing) {
      this.play(v, now);
      return true;
    }
    if (this.state.queue.length >= WATCH_QUEUE_MAX) return false;
    this.state.queue.push(v);
    return true;
  }

  pause(paused: boolean, now: number) {
    const w = this.state;
    if (!this.on || w.paused === paused) return;
    Object.assign(w, { offset: watchPosition(w, now), startedAt: now, paused });
  }

  seek(seconds: number, now: number) {
    if (!this.on) return;
    Object.assign(this.state, { offset: Math.max(0, seconds), startedAt: now });
  }

  /** Skip or the end of a video: only for the one still on (two people pressing at once skip one) */
  next(key: string, now: number) {
    if (!this.on || this.state.key !== key) return;
    this.playNext(now);
  }

  remove(key: string) {
    const i = this.state.queue.findIndex((v) => v.key === key);
    if (i >= 0) this.state.queue.splice(i, 1);
  }

  /** Everything off: nothing on, Up next empty (an owner or mod, a new map, an empty rug) */
  off() {
    this.state.queue.clear();
    Object.assign(this.state, { key: '', videoId: '', title: '', by: '', byName: '', offset: 0, startedAt: 0, paused: false });
    this.resume = false;
  }

  /** A few times a second: who's on the rug and whether someone shares on the TV */
  tick(now: number, watchers: number, sharing: boolean) {
    const w = this.state;
    if (sharing && !this.sharing) {
      this.sharing = true;
      this.resume = this.on && !w.paused;
      if (this.resume) this.pause(true, now);
    } else if (!sharing && this.sharing) {
      this.sharing = false;
      if (!this.on) this.playNext(now);
      else if (this.resume) this.pause(false, now);
      this.resume = false;
    }
    if (watchers > 0 || !(this.on || this.sharing || w.queue.length)) this.lastWatched = now;
    else if (now - this.lastWatched > EMPTY_SCREEN_MS) this.off();
  }

  private play(v: Video, now: number) {
    Object.assign(this.state, {
      key: v.key,
      videoId: v.videoId,
      title: v.title,
      by: v.by,
      byName: v.byName,
      offset: 0,
      startedAt: now,
      paused: false,
    });
  }

  private playNext(now: number) {
    const up = this.state.queue.shift();
    if (up) this.play(up, now);
    else this.off();
  }
}
