import { describe, expect, it } from 'vitest';
import { EMPTY_SCREEN_MS, WATCH_QUEUE_MAX } from '@connecta/shared';
import { Watch } from './state.js';
import { Tv } from './watch.js';

const video = (n: number) => ({ videoId: `vid${n}`.padEnd(11, '_'), title: `Video ${n}`, by: 's1', byName: 'Mai' });

describe('the big screen', () => {
  it('plays the first video, queues the rest, at most 20', () => {
    const tv = new Tv(new Watch());
    expect(tv.add(video(1), 1000)).toBe(true);
    expect(tv.state).toMatchObject({ videoId: video(1).videoId, offset: 0, startedAt: 1000, paused: false });
    for (let i = 0; i < WATCH_QUEUE_MAX; i++) expect(tv.add(video(i + 2), 1000)).toBe(true);
    expect(tv.add(video(99), 1000)).toBe(false);
    expect(tv.state.queue.length).toBe(WATCH_QUEUE_MAX);
  });

  it('pauses and seeks on one timeline; skip names the video, so two skips at once move on by one', () => {
    const tv = new Tv(new Watch());
    tv.add(video(1), 0);
    tv.add(video(2), 0);
    tv.add(video(3), 0);
    tv.pause(true, 10_000);
    expect(tv.state).toMatchObject({ offset: 10, paused: true });
    tv.seek(42, 11_000);
    tv.pause(false, 12_000);
    expect(tv.state).toMatchObject({ offset: 42, startedAt: 12_000, paused: false });
    const key = tv.state.key;
    tv.next(key, 13_000);
    tv.next(key, 13_000);
    expect(tv.state.videoId).toBe(video(2).videoId);
    tv.remove(tv.state.queue[0]!.key);
    tv.next(tv.state.key, 14_000);
    expect(tv.on).toBe(false);
  });

  it('a share takes over: the video pauses, new ones wait, and it carries on after', () => {
    const tv = new Tv(new Watch());
    tv.add(video(1), 0);
    tv.tick(5_000, 2, true);
    expect(tv.state).toMatchObject({ paused: true, offset: 5 });
    tv.tick(9_000, 2, false);
    expect(tv.state).toMatchObject({ paused: false, offset: 5, startedAt: 9_000 });

    // Paused before the share: stays paused after
    tv.pause(true, 10_000);
    tv.tick(11_000, 2, true);
    tv.tick(12_000, 2, false);
    expect(tv.state.paused).toBe(true);

    // Nothing on: a video added during a share waits, and plays when it ends
    const quiet = new Tv(new Watch());
    quiet.tick(0, 1, true);
    quiet.add(video(1), 100);
    expect(quiet.on).toBe(false);
    quiet.tick(200, 1, false);
    expect(quiet.state.videoId).toBe(video(1).videoId);
  });

  it('turns off 30 s after the last person leaves the rug', () => {
    const tv = new Tv(new Watch());
    tv.add(video(1), 0);
    tv.add(video(2), 0);
    tv.tick(1000, 1, false);
    tv.tick(2000, 0, false);
    tv.tick(1000 + EMPTY_SCREEN_MS, 0, false);
    expect(tv.on).toBe(true);
    tv.tick(1001 + EMPTY_SCREEN_MS, 0, false);
    expect(tv.on).toBe(false);
    expect(tv.state.queue.length).toBe(0);
  });
});
