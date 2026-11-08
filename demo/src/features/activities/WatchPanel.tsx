'use client';

import { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2, Pause, Play, Plus, SkipForward, Volume1, Volume2, VolumeX, X } from 'lucide-react';
import { useDismiss } from '../room/useDismiss';
import { cn } from '@/lib/utils';
import { watchPosition, type Video, type WatchState } from './hub';

/**
 * Watch together (feature 10): the big panel layer. The 3D screen only shows what's on for people
 * walking past; the video plays here, in sync for everyone in front of the screen. Anyone watching
 * controls it. The video keeps its volume while people talk (decided 2026-11-09).
 */

// --- YouTube links and the IFrame API ---

/** The video id from a youtube.com / youtu.be / Shorts link, or a bare id. */
export function parseYouTube(input: string): string | null {
  const s = input.trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  const m = s.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/);
  return m?.[1] ?? null;
}

async function titleOf(id: string): Promise<string> {
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(`https://youtu.be/${id}`)}&format=json`);
    if (res.ok) return ((await res.json()) as { title?: string }).title ?? 'YouTube video';
  } catch {
    // No title (offline, blocked): it still plays
  }
  return 'YouTube video';
}

interface YTPlayer {
  loadVideoById(o: { videoId: string; startSeconds?: number }): void;
  playVideo(): void;
  pauseVideo(): void;
  seekTo(s: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  setVolume(v: number): void;
  destroy(): void;
}
interface YTNamespace {
  Player: new (
    el: HTMLElement,
    o: {
      videoId: string;
      playerVars: Record<string, number>;
      events: { onReady?: () => void; onStateChange?: (e: { data: number }) => void };
    },
  ) => YTPlayer;
}
declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiReady: Promise<YTNamespace> | null = null;
function loadYouTube(): Promise<YTNamespace> {
  apiReady ??= new Promise((resolve) => {
    if (window.YT?.Player) return resolve(window.YT);
    window.onYouTubeIframeAPIReady = () => resolve(window.YT!);
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  });
  return apiReady;
}

const PLAYING = 1;
const ENDED = 0;
/** Further apart than this from the shared timeline and we seek back in line. */
const DRIFT_S = 2;

const clock = (s: number) => {
  const t = Math.max(0, Math.floor(s));
  const h = Math.floor(t / 3600);
  const mm = String(Math.floor((t % 3600) / 60)).padStart(h ? 2 : 1, '0');
  return `${h ? `${h}:` : ''}${mm}:${String(t % 60).padStart(2, '0')}`;
};

// --- The panel ---

/** Your own TV volume (0–100), kept in this browser. Nobody else hears a difference. */
const VOLUME_KEY = 'connecta:tv-volume';
function savedVolume() {
  try {
    const v = Number(localStorage.getItem(VOLUME_KEY));
    return Number.isFinite(v) && localStorage.getItem(VOLUME_KEY) !== null ? Math.min(100, Math.max(0, v)) : 80;
  } catch {
    return 80;
  }
}

/**
 * Big like Discord's activity view: the video takes most of the stage with Up next beside it. A press
 * anywhere else shrinks it to the corner (that press doesn't walk you), and a click on the small
 * player makes it big again.
 */
export function WatchPanel({
  watch,
  who,
  mini,
  onMini,
  onPause,
  onSeek,
  onSkip,
  onEnded,
  onAdd,
  onRemove,
}: {
  watch: WatchState;
  who: (id: string) => string;
  mini: boolean;
  onMini: (mini: boolean) => void;
  onPause: (paused: boolean) => void;
  onSeek: (seconds: number) => void;
  onSkip: () => void;
  onEnded: (videoId: string) => void;
  onAdd: (v: Omit<Video, 'by'>) => void;
  onRemove: (i: number) => void;
}) {
  const panel = useDismiss<HTMLElement>(!mini, () => onMini(true));
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const loaded = useRef<string | null>(null);
  const [ready, setReady] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(savedVolume);
  const [, setTick] = useState(0);
  const watchRef = useRef(watch);
  useEffect(() => {
    watchRef.current = watch;
  });
  const endedRef = useRef(onEnded);
  useEffect(() => {
    endedRef.current = onEnded;
  });

  // One player for the panel's life; videos change through loadVideoById
  useEffect(() => {
    let dead = false;
    const el = document.createElement('div');
    host.current?.appendChild(el);
    void loadYouTube().then((YT) => {
      if (dead) return;
      const w = watchRef.current;
      loaded.current = w.now?.id ?? null;
      player.current = new YT.Player(el, {
        videoId: w.now?.id ?? '',
        playerVars: { controls: 0, rel: 0, playsinline: 1, modestbranding: 1, disablekb: 1, start: Math.floor(watchPosition(w)) },
        events: {
          onReady: () => setReady(true),
          onStateChange: (e) => {
            if (e.data === ENDED && loaded.current) endedRef.current(loaded.current);
            if (e.data === PLAYING) setBlocked(false);
          },
        },
      });
    });
    return () => {
      dead = true;
      player.current?.destroy();
      player.current = null;
      // Also when the player never got made (React runs effects twice in development): a leftover
      // placeholder would push the real player out of the frame
      el.remove();
      setReady(false);
    };
  }, []);

  // Stay on the shared timeline: right video, playing or paused, within a couple of seconds
  useEffect(() => {
    if (!ready) return;
    const sync = () => {
      const p = player.current;
      const w = watchRef.current;
      if (!p || !w.now) return;
      const target = watchPosition(w);
      if (loaded.current !== w.now.id) {
        loaded.current = w.now.id;
        p.loadVideoById({ videoId: w.now.id, startSeconds: target });
        return;
      }
      if (Math.abs(p.getCurrentTime() - target) > DRIFT_S) p.seekTo(target, true);
      if (w.paused) p.pauseVideo();
      else if (p.getPlayerState() !== PLAYING) {
        p.playVideo();
        // Browsers can refuse sound before a click on the page: offer one
        setTimeout(
          () => player.current && player.current.getPlayerState() !== PLAYING && !watchRef.current.paused && setBlocked(true),
          1500,
        );
      }
      setDuration(p.getDuration() || 0);
      setTick((t) => t + 1);
    };
    sync();
    const id = setInterval(sync, 1000);
    return () => clearInterval(id);
  }, [ready, watch.now?.id, watch.paused, watch.startedAt]);

  useEffect(() => {
    if (ready) player.current?.setVolume(volume);
    try {
      localStorage.setItem(VOLUME_KEY, String(volume));
    } catch {
      // Not remembered, that's all
    }
  }, [volume, ready]);

  const pos = watchPosition(watch);
  const live = duration === 0 || !Number.isFinite(duration);

  return (
    <section
      ref={panel}
      className={cn(
        'panel flex max-h-[calc(100dvh-80px)] flex-col gap-2 overflow-y-auto p-2.5',
        mini ? 'w-[300px]' : 'max-w-[calc(100vw-1.5rem)]',
      )}
      style={mini ? undefined : { width: 'min(1180px, calc(100vw - 160px), calc((100dvh - 190px) * 16 / 9 + 300px))' }}
      aria-label="Watch together"
    >
      <div className={cn('flex flex-col gap-2', !mini && 'lg:flex-row')}>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
            <div ref={host} className="absolute inset-0 [&>*]:h-full [&>*]:w-full" />
            {mini ? (
              // The small player's picture is one big "make it bigger" button
              <button onClick={() => onMini(false)} aria-label="Make it bigger" className="absolute inset-0 hover:bg-white/10" />
            ) : (
              blocked && (
                <button
                  onClick={() => {
                    player.current?.playVideo();
                    setBlocked(false);
                  }}
                  className="absolute inset-0 grid place-items-center bg-black/50 text-sm font-extrabold text-white"
                >
                  ▶ Tap to watch with sound
                </button>
              )
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <IconBtn label={watch.paused ? 'Play' : 'Pause'} onClick={() => onPause(!watch.paused)}>
              {watch.paused ? <Play className="size-4 fill-current" /> : <Pause className="size-4 fill-current" />}
            </IconBtn>
            {!mini && (
              <>
                <span className="w-12 text-right font-mono text-[11px] text-muted-foreground tabular-nums">{clock(pos)}</span>
                <input
                  type="range"
                  min={0}
                  max={live ? 1 : Math.floor(duration)}
                  value={live ? 1 : Math.min(Math.floor(pos), Math.floor(duration))}
                  disabled={live}
                  onChange={(e) => onSeek(Number(e.target.value))}
                  aria-label="Seek"
                  className="min-w-0 flex-1 accent-[var(--primary)]"
                />
                <span className="w-12 font-mono text-[11px] text-muted-foreground tabular-nums">{live ? 'LIVE' : clock(duration)}</span>
              </>
            )}
            {mini && <span className="min-w-0 flex-1 truncate text-xs font-bold">{watch.now?.title}</span>}
            <IconBtn label="Skip" onClick={onSkip}>
              <SkipForward className="size-4" />
            </IconBtn>
            {!mini && <VolumeControl volume={volume} onChange={setVolume} />}
            <IconBtn label={mini ? 'Make it bigger' : 'Shrink to the corner'} onClick={() => onMini(!mini)}>
              {mini ? <Maximize2 className="size-4" /> : <Minimize2 className="size-4" />}
            </IconBtn>
          </div>
        </div>

        {!mini && (
          <aside className="flex flex-col gap-2 lg:w-[280px] lg:flex-none">
            <div className="px-1">
              <p className="text-[11px] font-black text-muted-foreground">Now playing</p>
              <p className="line-clamp-2 text-sm font-extrabold">{watch.now?.title}</p>
              {watch.now && <p className="text-[11px] text-muted-foreground">put on by {who(watch.now.by)}</p>}
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-1 rounded-xl bg-muted/60 p-2">
              <p className="px-1 text-[11px] font-black text-muted-foreground">
                Up next {watch.queue.length > 0 && `· ${watch.queue.length}`}
              </p>
              {watch.queue.length === 0 && <p className="px-1 text-[11px] text-muted-foreground">Nothing yet. Anyone watching can add.</p>}
              <div className="flex max-h-[40dvh] flex-col gap-1 overflow-y-auto">
                {watch.queue.map((v, i) => (
                  <div key={`${v.id}-${i}`} className="flex items-center gap-2 rounded-lg bg-card px-2 py-1 text-xs">
                    <span className="min-w-0 flex-1 truncate font-bold">{v.title}</span>
                    <span className="text-muted-foreground">{who(v.by)}</span>
                    <button
                      onClick={() => onRemove(i)}
                      aria-label={`Remove ${v.title}`}
                      className="rounded p-0.5 text-muted-foreground hover:bg-muted"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-auto">
                <AddVideo onAdd={onAdd} compact />
              </div>
            </div>
          </aside>
        )}
      </div>
    </section>
  );
}

/** Your own volume for the TV: a speaker button (mute) and a small slider. */
function VolumeControl({ volume, onChange }: { volume: number; onChange: (v: number) => void }) {
  const [before, setBefore] = useState(80);
  return (
    <span className="flex items-center gap-1">
      <IconBtn
        label={volume ? 'Mute (just for you)' : 'Unmute'}
        onClick={() => {
          if (volume) setBefore(volume);
          onChange(volume ? 0 : before || 80);
        }}
      >
        {volume === 0 ? <VolumeX className="size-4" /> : volume < 50 ? <Volume1 className="size-4" /> : <Volume2 className="size-4" />}
      </IconBtn>
      <input
        type="range"
        min={0}
        max={100}
        value={volume}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Your TV volume"
        title="Your TV volume (only you)"
        className="w-20 accent-[var(--primary)]"
      />
    </span>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid size-8 flex-none place-items-center rounded-full hover:bg-muted"
    >
      {children}
    </button>
  );
}

/** Paste a YouTube link (Shorts work too). Search would cost YouTube API quota; pasting is free. */
export function AddVideo({ onAdd, compact }: { onAdd: (v: Omit<Video, 'by'>) => void; compact?: boolean }) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    const id = parseYouTube(text);
    if (!id) return setError('That doesn’t look like a YouTube link');
    setBusy(true);
    onAdd({ id, title: await titleOf(id) });
    setBusy(false);
    setText('');
    setError('');
  };
  return (
    <form
      className="flex flex-col gap-1"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div className="flex gap-1">
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setError('');
          }}
          placeholder="Paste a YouTube link"
          aria-label="YouTube link"
          className={cn('min-w-0 flex-1 rounded-full border bg-card px-3 text-xs', compact ? 'h-8' : 'h-9')}
        />
        <button
          disabled={busy || !text.trim()}
          className={cn(
            'flex flex-none items-center gap-1 rounded-full bg-primary px-3 text-xs font-extrabold text-primary-foreground disabled:opacity-45',
            compact ? 'h-8' : 'h-9',
          )}
        >
          <Plus className="size-3.5" /> {compact ? 'Add' : 'Put it on'}
        </button>
      </div>
      {error && <p className="px-2 text-[11px] font-bold text-destructive">{error}</p>}
    </form>
  );
}
