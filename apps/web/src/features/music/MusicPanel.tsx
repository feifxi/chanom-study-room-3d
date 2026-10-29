'use client';

import { ChevronLeft, ChevronRight, Pause, Play, Volume1, Volume2, VolumeX } from 'lucide-react';
import { TRACKS } from './tracks';
import type { Music } from './useMusic';

/** The lo-fi player in the left rail: one track at a time, ‹ › to switch. Only you hear it. */
export function MusicPanel({ music }: { music: Music }) {
  const t = TRACKS[music.index]!;
  const VolumeIcon = music.volume === 0 ? VolumeX : music.volume < 0.5 ? Volume1 : Volume2;
  const arrow = 'grid size-8 flex-none place-items-center rounded-full text-muted hover:bg-white/70 hover:text-ink';
  return (
    <div className="panel flex w-64 flex-col gap-4 p-4">
      <h2 className="text-sm font-extrabold">Music</h2>

      <div className="flex flex-col items-center gap-3 rounded-2xl bg-gradient-to-br from-lavender to-peach px-2 py-4">
        <span
          className={`grid size-16 place-items-center rounded-full bg-white/80 text-3xl shadow-sm ${music.playing ? 'animate-[spin_6s_linear_infinite]' : ''}`}
          aria-hidden="true"
        >
          💿
        </span>
        <div className="flex w-full items-center gap-1">
          <button onClick={music.prev} aria-label="Previous track" className={arrow}>
            <ChevronLeft className="size-5" />
          </button>
          <div className="min-w-0 flex-1 text-center" aria-live="polite">
            <p className="truncate text-sm font-bold">{t.title}</p>
            <p className="truncate text-xs text-muted">{t.artist}</p>
          </div>
          <button onClick={music.next} aria-label="Next track" className={arrow}>
            <ChevronRight className="size-5" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => (music.playing ? music.pause() : music.play())}
          aria-label={music.playing ? 'Pause' : 'Play'}
          className="grid size-11 flex-none place-items-center rounded-full bg-accent text-white"
        >
          {music.playing ? <Pause className="size-5" /> : <Play className="size-5 translate-x-px" />}
        </button>
        <label className="flex min-w-0 flex-1 items-center gap-2 text-muted">
          <VolumeIcon className="size-4 flex-none" aria-hidden="true" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={music.volume}
            onChange={(e) => music.setVolume(Number(e.target.value))}
            aria-label="Music volume"
            className="min-w-0 flex-1 accent-[var(--accent)]"
          />
        </label>
      </div>

      <p className="text-[11px] leading-relaxed text-muted">
        Only you hear it, and it gets quieter while people talk. Music by Alex Morgan via{' '}
        <a href="https://pixabay.com/music/" target="_blank" rel="noreferrer" className="underline hover:text-ink">
          Pixabay
        </a>
        .
      </p>
    </div>
  );
}
