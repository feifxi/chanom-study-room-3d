'use client';

import { useCallback, useEffect, useState } from 'react';
import { DUCKED, TRACKS, nextIndex, prevIndex } from './tracks';

const KEY = 'chanom-study:music';
const FADE_MS = 400;

interface Saved {
  index: number;
  volume: number;
}

function load(): Saved {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Saved>;
    const index = Number.isInteger(raw.index) && raw.index! >= 0 && raw.index! < TRACKS.length ? raw.index! : 0;
    const volume = typeof raw.volume === 'number' && raw.volume >= 0 && raw.volume <= 1 ? raw.volume : 0.5;
    return { index, volume };
  } catch {
    return { index: 0, volume: 0.5 };
  }
}

export interface Music {
  index: number;
  playing: boolean;
  volume: number;
  play: (index?: number) => void;
  pause: () => void;
  next: () => void;
  prev: () => void;
  setVolume: (v: number) => void;
}

/** Owns the <audio> element; plain class because it changes the element imperatively. */
class MusicEngine {
  readonly audio: HTMLAudioElement;
  private fade: ReturnType<typeof setInterval> | null = null;

  constructor(src: string) {
    this.audio = new Audio(src);
    this.audio.preload = 'none'; // nothing downloads until someone presses play
  }

  play(src?: string) {
    if (src && !this.audio.src.endsWith(src)) this.audio.src = src;
    return this.audio.play();
  }

  pause() {
    this.audio.pause();
  }

  /** Ease to the target volume instead of jumping (ducking under voices, dragging the slider). */
  fadeTo(target: number) {
    if (this.fade) clearInterval(this.fade);
    const start = this.audio.volume;
    const began = performance.now();
    this.fade = setInterval(() => {
      const k = Math.min(1, (performance.now() - began) / FADE_MS);
      this.audio.volume = start + (target - start) * k;
      if (k === 1 && this.fade) {
        clearInterval(this.fade);
        this.fade = null;
      }
    }, 30);
  }

  on(event: 'play' | 'pause' | 'ended', fn: () => void) {
    this.audio.addEventListener(event, fn);
    return () => this.audio.removeEventListener(event, fn);
  }
}

/**
 * Personal lo-fi player: only you hear it. One <audio> element for the whole visit; the panel just
 * controls it. It dips while someone is talking (`duck`) so voices stay clear, never starts on its
 * own (browsers block that), and remembers the track and volume in this browser.
 */
export function useMusic(duck: boolean): Music {
  const [saved] = useState(load);
  const [engine] = useState(() => new MusicEngine(TRACKS[saved.index]!.src));
  const [index, setIndex] = useState(saved.index);
  const [volume, setVolumeState] = useState(saved.volume);
  const [playing, setPlaying] = useState(false);

  const play = useCallback(
    (i?: number) => {
      const target = i ?? index;
      if (target !== index) setIndex(target);
      void engine.play(TRACKS[target]!.src).catch(() => setPlaying(false));
    },
    [engine, index],
  );
  const pause = useCallback(() => engine.pause(), [engine]);
  const next = useCallback(() => play(nextIndex(index)), [play, index]);
  const prev = useCallback(() => play(prevIndex(index)), [play, index]);

  // Mirror the element's state, and carry on with the next track when one ends
  useEffect(() => {
    const offs = [engine.on('play', () => setPlaying(true)), engine.on('pause', () => setPlaying(false)), engine.on('ended', next)];
    return () => offs.forEach((off) => off());
  }, [engine, next]);

  // Leaving the room (or Next hiding the page) stops the music
  useEffect(() => () => engine.pause(), [engine]);

  // Volume, dipped while someone is talking
  useEffect(() => {
    engine.fadeTo(duck ? volume * DUCKED : volume);
  }, [engine, volume, duck]);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ index, volume }));
    } catch {
      // Blocked storage: settings just aren't remembered
    }
  }, [index, volume]);

  // Media keys and the system's "now playing" controls
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    const t = TRACKS[index]!;
    navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: t.artist, album: 'Chanom Study Room' });
    navigator.mediaSession.setActionHandler('play', () => play());
    navigator.mediaSession.setActionHandler('pause', pause);
    navigator.mediaSession.setActionHandler('nexttrack', next);
    navigator.mediaSession.setActionHandler('previoustrack', prev);
  }, [index, play, pause, next, prev]);

  return { index, playing, volume, play, pause, next, prev, setVolume: setVolumeState };
}
