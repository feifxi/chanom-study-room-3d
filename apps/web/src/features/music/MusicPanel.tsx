'use client';

import { Pause, Play, SkipBack, SkipForward, Volume1, Volume2, VolumeX } from 'lucide-react';
import { TRACKS } from './tracks';
import type { Music } from './useMusic';

/** The lo-fi player in the left rail. Only you hear it. */
export function MusicPanel({ music }: { music: Music }) {
  const t = TRACKS[music.index]!;
  const VolumeIcon = music.volume === 0 ? VolumeX : music.volume < 0.5 ? Volume1 : Volume2;
  return (
    <div className="panel flex flex-col gap-3 p-4">
      <h2 className="text-sm font-extrabold">Music</h2>

      <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-br from-lavender to-peach p-3">
        <span
          className={`grid size-11 flex-none place-items-center rounded-xl bg-white/80 text-xl ${music.playing ? 'animate-pulse' : ''}`}
        >
          🎧
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{t.title}</p>
          <p className="truncate text-xs text-muted">{t.artist}</p>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2">
        <button
          onClick={music.prev}
          aria-label="Previous track"
          className="grid size-9 place-items-center rounded-full text-muted hover:bg-soft hover:text-ink"
        >
          <SkipBack className="size-4" />
        </button>
        <button
          onClick={() => (music.playing ? music.pause() : music.play())}
          aria-label={music.playing ? 'Pause' : 'Play'}
          className="grid size-12 place-items-center rounded-full bg-accent text-white"
        >
          {music.playing ? <Pause className="size-5" /> : <Play className="size-5 translate-x-px" />}
        </button>
        <button
          onClick={music.next}
          aria-label="Next track"
          className="grid size-9 place-items-center rounded-full text-muted hover:bg-soft hover:text-ink"
        >
          <SkipForward className="size-4" />
        </button>
      </div>

      <label className="flex items-center gap-2 text-muted">
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

      <ol className="flex flex-col gap-0.5">
        {TRACKS.map((track, i) => (
          <li key={track.src}>
            <button
              onClick={() => music.play(i)}
              aria-current={i === music.index}
              className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm ${i === music.index ? 'bg-accent-soft font-bold text-accent-ink' : 'hover:bg-soft'}`}
            >
              <span className="w-4 text-center text-xs">{i === music.index && music.playing ? '♪' : i + 1}</span>
              <span className="truncate">{track.title}</span>
            </button>
          </li>
        ))}
      </ol>

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
