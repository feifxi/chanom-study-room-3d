'use client';

import { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2, MonitorUp, Pause, Play, Plus, SkipForward, Volume1, Volume2, VolumeX, X } from 'lucide-react';
import { useDismiss } from '../room/useDismiss';
import { canShareScreen, isTouchScreen } from '@/lib/screen';
import { cn } from '@/lib/utils';
import { WATCH_DRIFT_S, parseYouTube } from '@connecta/shared';
import { watchPosition, type ScreenShare, type Video, type WatchState } from './hub';
import { myShareStream } from './screenShare';

/**
 * Watch together (feature 10): the big panel layer. The 3D screen only shows what's on for people
 * walking past; the video plays here, in sync for everyone in front of the screen. Anyone watching
 * controls it. The video keeps its volume while people talk (decided 2026-11-09).
 */

// --- YouTube links and the IFrame API ---

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
  watchers,
  mini,
  onMini,
  onPause,
  onSeek,
  onSkip,
  onEnded,
  onAdd,
  onRemove,
  onShare,
  onStopShare,
  shareStream,
  deaf,
  onTurnOff,
}: {
  watch: WatchState;
  who: (id: string) => string;
  /** Everyone in front of the screen (the TV has no top strip: being there is watching). */
  watchers: number;
  mini: boolean;
  onMini: (mini: boolean) => void;
  onPause: (paused: boolean) => void;
  onSeek: (seconds: number) => void;
  onSkip: () => void;
  onEnded: (videoId: string) => void;
  onAdd: (v: Omit<Video, 'by'>) => void;
  onRemove: (i: number) => void;
  onShare: () => void;
  onStopShare: () => void;
  /** Someone else's share as it arrives over LiveKit (a real room); none in the demo */
  shareStream?: (by: string) => MediaStream | null;
  /** Deafened: a share's sound is off too */
  deaf?: boolean;
  /** Owners and mods: everything off the screen (something unsuitable) */
  onTurnOff?: () => void;
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
      if (Math.abs(p.getCurrentTime() - target) > WATCH_DRIFT_S) p.seekTo(target, true);
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
  const share = watch.share;
  const mine = share?.by === 'me';
  const shareName = share && (mine ? 'Your' : `${who(share.by)}’s`);

  return (
    <section
      ref={panel}
      className={cn(
        'panel flex flex-col gap-2 overflow-y-auto p-2.5',
        mini ? 'max-h-[calc(100dvh-80px)] w-[300px]' : 'max-h-full w-full self-start',
      )}
      // Theater: as wide as the stage allows while the video still fits its height (the stage is the
      // screen less the top strip and the dock, 144 px; the controls and padding take 64 px more; the
      // sidebar 308 px)
      style={mini ? undefined : { maxWidth: 'min(1440px, calc((100dvh - 160px) * 16 / 9 + 308px))' }}
      aria-label="Watch together"
    >
      <div className={cn('flex flex-col gap-2', !mini && 'min-h-0 flex-1 lg:flex-row')}>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
            <div ref={host} className="absolute inset-0 [&>*]:h-full [&>*]:w-full" />
            {share && (
              <SharePicture
                share={share}
                name={who(share.by)}
                stream={shareStream ? (share.by === 'me' ? myShareStream() : shareStream(share.by)) : undefined}
                volume={deaf ? 0 : volume}
              />
            )}
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

          {share ? (
            <div className="flex items-center gap-1.5">
              <MonitorUp className="ml-1.5 size-4 flex-none text-primary" />
              <span className="min-w-0 flex-1 truncate text-xs font-bold">
                {shareName} screen
                {!mini && <span className="font-semibold text-muted-foreground"> · {share.audio ? '🔊 with sound' : '🔇 no sound'}</span>}
              </span>
              {/* Your own screen plays muted for you (no echo); everyone else has their volume */}
              {!mini && !mine && share.audio && <VolumeControl volume={volume} onChange={setVolume} />}
              {mine && (
                <button
                  onClick={onStopShare}
                  className="flex-none rounded-full bg-destructive px-3 py-1.5 text-xs font-extrabold text-white"
                >
                  Stop sharing
                </button>
              )}
              <IconBtn label={mini ? 'Make it bigger' : 'Shrink to the corner'} onClick={() => onMini(!mini)}>
                {mini ? <Maximize2 className="size-4" /> : <Minimize2 className="size-4" />}
              </IconBtn>
            </div>
          ) : (
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
          )}
        </div>

        {!mini && (
          <aside className="flex min-h-0 flex-1 flex-col gap-2 lg:w-[280px] lg:flex-none">
            {share ? (
              <div className="px-1">
                <p className="text-[11px] font-black text-muted-foreground">Sharing now</p>
                <p className="text-sm font-extrabold">{shareName} screen</p>
                <p className="text-[11px] text-muted-foreground">{watchers} watching</p>
                {watch.now && <p className="line-clamp-2 text-[11px] text-muted-foreground">Then “{watch.now.title}” carries on</p>}
              </div>
            ) : (
              <div className="px-1">
                <p className="text-[11px] font-black text-muted-foreground">Now playing</p>
                <p className="line-clamp-2 text-sm font-extrabold">{watch.now?.title}</p>
                {watch.now && (
                  <p className="text-[11px] text-muted-foreground">
                    put on by {watch.now.byName ?? who(watch.now.by)} · {watchers} watching
                  </p>
                )}
              </div>
            )}
            <div className="flex min-h-0 flex-1 flex-col gap-1 rounded-xl bg-muted/60 p-2">
              <div className="flex items-center gap-2 px-1">
                <p className="flex-1 text-[11px] font-black text-muted-foreground">
                  Up next {watch.queue.length > 0 && `· ${watch.queue.length}`}
                </p>
                {onTurnOff && (
                  <button
                    onClick={onTurnOff}
                    title="Owners and mods: turn the screen off and clear Up next"
                    className="rounded-full px-2 py-0.5 text-[11px] font-bold text-muted-foreground hover:bg-card hover:text-destructive"
                  >
                    Turn off the TV
                  </button>
                )}
              </div>
              {watch.queue.length === 0 && <p className="px-1 text-[11px] text-muted-foreground">Nothing yet. Anyone watching can add.</p>}
              <div className="flex max-h-[40dvh] flex-col gap-1 overflow-y-auto">
                {watch.queue.map((v, i) => (
                  <div key={v.key ?? `${v.id}-${i}`} className="flex items-center gap-2 rounded-lg bg-card px-2 py-1 text-xs">
                    <span className="min-w-0 flex-1 truncate font-bold">{v.title}</span>
                    <span className="text-muted-foreground">{v.byName ?? who(v.by)}</span>
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
              <div className="mt-auto flex flex-col gap-1.5">
                <AddVideo onAdd={onAdd} compact />
                {!share && <ShareScreenButton onShare={onShare} compact />}
              </div>
            </div>
          </aside>
        )}
      </div>
    </section>
  );
}

/**
 * A shared screen on the stage. Your own share shows your live capture (muted: you'd hear yourself
 * twice); someone else's plays with its sound at your volume. In the demo nobody else really
 * shares, so their screens are a pretend slide (`stream` undefined); in a real room it's null until
 * the picture arrives.
 */
function SharePicture({
  share,
  name,
  stream,
  volume = 80,
}: {
  share: ScreenShare;
  name: string;
  stream?: MediaStream | null;
  volume?: number;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const mine = share.by === 'me';
  const shown = stream === undefined && mine ? myShareStream() : stream;
  useEffect(() => {
    if (video.current) video.current.srcObject = shown ?? null;
  }, [shown]);
  useEffect(() => {
    if (video.current) video.current.volume = volume / 100;
  }, [volume, shown]);
  if (shown) return <video ref={video} autoPlay muted={mine} playsInline className="absolute inset-0 size-full bg-black object-contain" />;
  if (stream === null)
    return (
      <div className="absolute inset-0 grid place-items-center bg-black text-sm font-bold text-white/70">
        <span className="animate-pulse">{name}’s screen is on its way…</span>
      </div>
    );
  return (
    <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-[#2b2f5c] to-[#4b2d55] p-6 text-white">
      <div className="w-full max-w-[520px] rounded-xl bg-white/10 p-4 shadow-lg ring-1 ring-white/15">
        <div className="mb-3 flex gap-1.5">
          {['#ff8a8a', '#ffd36e', '#8fe3a1'].map((c) => (
            <span key={c} className="size-2.5 rounded-full" style={{ background: c }} />
          ))}
        </div>
        <p className="text-lg font-black">📊 Group project · slide 3</p>
        <div className="mt-3 flex flex-col gap-2">
          {[90, 72, 80].map((w) => (
            <span key={w} className="h-2.5 rounded-full bg-white/25" style={{ width: `${w}%` }} />
          ))}
        </div>
      </div>
      <p className="absolute bottom-2 text-[11px] font-bold text-white/70">{name}’s screen · a pretend picture in the demo</p>
    </div>
  );
}

/** Share your screen on the TV. Phones can't (browsers don't let them), so it says so instead. */
export function ShareScreenButton({ onShare, compact }: { onShare: () => void; compact?: boolean }) {
  const can = canShareScreen() && !isTouchScreen();
  return (
    <div className="flex flex-col gap-0.5">
      <button
        onClick={onShare}
        disabled={!can}
        className={cn(
          'flex items-center justify-center gap-1.5 rounded-full border bg-card px-3 text-xs font-extrabold hover:bg-muted disabled:opacity-45',
          compact ? 'h-8' : 'h-9',
        )}
      >
        <MonitorUp className="size-3.5" /> Share your screen
      </button>
      {!can && <p className="px-2 text-[11px] text-muted-foreground">Phones can’t share their screen. You can still watch.</p>}
    </div>
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
        // Phones use their volume buttons; the slider would squeeze the seek bar to nothing
        className="w-20 accent-[var(--primary)] max-sm:hidden"
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

/**
 * A desk share (feature 6): the same picture and controls as a share on the TV, for the people
 * seated at the sharer's table. Big over the room, or small in the corner.
 */
export function SharePanel({
  share,
  name,
  stream,
  deaf,
  mini,
  onMini,
  onStop,
}: {
  share: ScreenShare;
  name: string;
  stream: MediaStream | null;
  deaf: boolean;
  mini: boolean;
  onMini: (mini: boolean) => void;
  onStop: () => void;
}) {
  const panel = useDismiss<HTMLElement>(!mini, () => onMini(true));
  const [volume, setVolume] = useState(savedVolume);
  const mine = share.by === 'me';
  useEffect(() => {
    try {
      localStorage.setItem(VOLUME_KEY, String(volume));
    } catch {
      // Not remembered, that's all
    }
  }, [volume]);
  return (
    <section
      ref={panel}
      className={cn('panel flex flex-col gap-2 p-2.5', mini ? 'w-[300px]' : 'max-h-full w-full self-start')}
      style={mini ? undefined : { maxWidth: 'min(1440px, calc((100dvh - 160px) * 16 / 9))' }}
      aria-label="Screen share"
    >
      <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
        <SharePicture share={share} name={name} stream={mine ? myShareStream() : stream} volume={deaf ? 0 : volume} />
        {mini && <button onClick={() => onMini(false)} aria-label="Make it bigger" className="absolute inset-0 hover:bg-white/10" />}
      </div>
      <div className="flex items-center gap-1.5">
        <MonitorUp className="ml-1.5 size-4 flex-none text-primary" />
        <span className="min-w-0 flex-1 truncate text-xs font-bold">
          {mine ? 'Your' : `${name}’s`} screen · your table
          {!mini && <span className="font-semibold text-muted-foreground"> · {share.audio ? '🔊 with sound' : '🔇 no sound'}</span>}
        </span>
        {!mini && !mine && share.audio && <VolumeControl volume={volume} onChange={setVolume} />}
        {mine && (
          <button onClick={onStop} className="flex-none rounded-full bg-destructive px-3 py-1.5 text-xs font-extrabold text-white">
            Stop sharing
          </button>
        )}
        <IconBtn label={mini ? 'Make it bigger' : 'Shrink to the corner'} onClick={() => onMini(!mini)}>
          {mini ? <Maximize2 className="size-4" /> : <Minimize2 className="size-4" />}
        </IconBtn>
      </div>
    </section>
  );
}
