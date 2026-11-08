'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, Copy, Download, MessageCircle, Timer, X } from 'lucide-react';
import { toast } from 'sonner';
import { LogoMark } from '@/components/Logo';
import { cn } from '@/lib/utils';

const FRAMES = [
  { id: 'white', label: 'White', border: 'border-white', swatch: '#ffffff' },
  { id: 'pink', label: 'Strawberry', border: 'border-[#ffd2e3]', swatch: '#ffd2e3' },
  { id: 'cocoa', label: 'Cocoa', border: 'border-[#4a3443]', swatch: '#4a3443' },
] as const;
type FrameId = (typeof FRAMES)[number]['id'];

/** The frame's inset from the screen edges (CSS px), matching the overlay below. */
const INSET = { side: 16, top: 16, bottom: 112 };
const BORDER = 12;

/**
 * Photo mode from anywhere (feature 10): the HUD and name labels hide (photos never show names), a
 * frame with the logo appears, you can still drag the camera, then snap now or with a 3 s timer.
 * Others see 📸 over your head so they can pose. Nothing is kept by Connecta: you save it, share it to
 * Room chat, or copy it.
 */
export function PhotoMode({ roomName, onClose }: { roomName: string; onClose: () => void }) {
  const [frame, setFrame] = useState<FrameId>('white');
  const [flash, setFlash] = useState(0);
  const [timer, setTimer] = useState(false);
  const [count, setCount] = useState(0);
  const [shot, setShot] = useState<{ url: string; blob: Blob } | null>(null);
  const f = FRAMES.find((x) => x.id === frame)!;
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const frameRef = useRef(frame);
  useEffect(() => {
    frameRef.current = frame;
  });

  const snap = async () => {
    setFlash((n) => n + 1);
    const out = await capture(FRAMES.find((x) => x.id === frameRef.current)!.swatch, roomName, date);
    if (out) setShot({ url: URL.createObjectURL(out), blob: out });
    else toast.error('Couldn’t take the photo. Try again?');
  };

  // The 3 s timer: 3, 2, 1, snap
  useEffect(() => {
    if (!count) return;
    const id = setTimeout(() => (count === 1 ? (setCount(0), void snap()) : setCount(count - 1)), 1000);
    return () => clearTimeout(id);
    // snap reads the latest frame through a ref
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  useEffect(
    () => () => {
      if (shot) URL.revokeObjectURL(shot.url);
    },
    [shot],
  );

  return (
    <div className="pointer-events-none absolute inset-0 z-30">
      <div
        className={cn('absolute rounded-[28px] shadow-[0_0_0_9999px_rgb(30_18_28/0.5)]', f.border)}
        style={{ left: INSET.side, right: INSET.side, top: INSET.top, bottom: INSET.bottom, borderWidth: BORDER }}
      >
        <span className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-white/95 py-1 pr-3 pl-1.5 text-sm font-black text-[#45323d]">
          <LogoMark size={22} /> Connecta · {roomName}
        </span>
        <span className="absolute right-3 bottom-3 rounded-full bg-white/95 px-3 py-1 font-mono text-xs font-bold text-[#45323d]">
          {date}
        </span>
        {count > 0 && (
          <span key={count} className="absolute inset-0 grid place-items-center text-8xl font-black text-white drop-shadow-lg">
            {count}
          </span>
        )}
      </div>

      {!shot && (
        <div className="pointer-events-auto absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-3">
          <button onClick={onClose} className="flex items-center gap-1 rounded-full bg-card px-4 py-2 text-sm font-bold shadow-soft">
            <X className="size-4" /> Close
          </button>
          <button
            onClick={() => setTimer(!timer)}
            aria-pressed={timer}
            title="3-second timer"
            className={cn(
              'flex items-center gap-1 rounded-full px-3 py-2 text-sm font-bold shadow-soft',
              timer ? 'bg-primary text-primary-foreground' : 'bg-card',
            )}
          >
            <Timer className="size-4" /> 3s
          </button>
          <button
            onClick={() => (timer ? setCount(3) : void snap())}
            disabled={count > 0}
            className="grid size-[68px] place-items-center rounded-full bg-white text-[#df6392] shadow-[0_0_0_5px_rgb(255_255_255/0.45),0_10px_26px_rgb(0_0_0/0.3)]"
            aria-label={timer ? 'Take photo in 3 seconds' : 'Take photo'}
          >
            <Camera className="size-7" />
          </button>
          <div className="flex gap-1.5 rounded-full bg-card p-1.5 shadow-soft" role="group" aria-label="Frame">
            {FRAMES.map((x) => (
              <button
                key={x.id}
                onClick={() => setFrame(x.id)}
                aria-label={`${x.label} frame`}
                aria-pressed={frame === x.id}
                className={cn(
                  'size-7 rounded-full border-[3px] border-card',
                  frame === x.id ? 'ring-2 ring-primary' : 'ring-1 ring-border',
                )}
                style={{ background: x.swatch }}
              />
            ))}
          </div>
        </div>
      )}

      {shot && (
        <div className="pointer-events-auto absolute inset-0 grid place-items-center bg-black/40 p-4">
          <div className="panel flex w-[520px] max-w-full flex-col gap-3 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- a local blob, nothing to optimise */}
            <img src={shot.url} alt={`Photo in ${roomName}`} className="w-full rounded-xl" />
            <div className="grid grid-cols-3 gap-2">
              <a
                href={shot.url}
                download={`connecta-${roomName.toLowerCase().replace(/\s+/g, '-')}.png`}
                className="flex items-center justify-center gap-1.5 rounded-full bg-primary py-2 text-sm font-extrabold text-primary-foreground hover:bg-primary-ink"
              >
                <Download className="size-4" /> Save
              </a>
              <button
                onClick={() => {
                  // The demo has no upload: the real app posts it to the room's saved chat
                  toast.success('📸 Shared to Room chat');
                  setShot(null);
                }}
                className="flex items-center justify-center gap-1.5 rounded-full border py-2 text-sm font-extrabold hover:bg-muted"
              >
                <MessageCircle className="size-4" /> Share
              </button>
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.write([new ClipboardItem({ 'image/png': shot.blob })]);
                    toast.success('Copied');
                  } catch {
                    toast.error('Your browser won’t copy images. Save it instead.');
                  }
                }}
                className="flex items-center justify-center gap-1.5 rounded-full border py-2 text-sm font-extrabold hover:bg-muted"
              >
                <Copy className="size-4" /> Copy
              </button>
            </div>
            <button onClick={() => setShot(null)} className="text-xs font-bold text-muted-foreground hover:text-foreground">
              Take another
            </button>
          </div>
        </div>
      )}
      {flash > 0 && <div key={flash} className="camera-flash absolute inset-0 bg-white opacity-0" />}
    </div>
  );
}

/** The 3D canvas inside the frame, with the frame, logo line and date drawn on (labels are DOM, so they're never in it). */
async function capture(frameColor: string, roomName: string, date: string): Promise<Blob | null> {
  const src = document.querySelector<HTMLCanvasElement>('canvas');
  if (!src) return null;
  const k = src.width / src.clientWidth;
  const rect = src.getBoundingClientRect();
  const x = INSET.side * k;
  const y = INSET.top * k;
  const w = (rect.width - INSET.side * 2) * k;
  const h = (rect.height - INSET.top - INSET.bottom) * k;
  const out = document.createElement('canvas');
  out.width = Math.round(w);
  out.height = Math.round(h);
  const g = out.getContext('2d');
  if (!g) return null;
  g.drawImage(src, x, y, w, h, 0, 0, w, h);
  const b = BORDER * k;
  g.strokeStyle = frameColor;
  g.lineWidth = b * 2;
  g.strokeRect(0, 0, w, h);
  // Logo line and date, like the overlay
  const fs = 14 * k;
  g.font = `900 ${fs}px system-ui, sans-serif`;
  const label = `Connecta · ${roomName}`;
  const pad = 10 * k;
  const lw = g.measureText(label).width + pad * 2;
  g.fillStyle = 'rgba(255,255,255,0.95)';
  pill(g, b + 12 * k, h - b - 12 * k - fs * 2, lw, fs * 2);
  g.fillStyle = '#45323d';
  g.fillText(label, b + 12 * k + pad, h - b - 12 * k - fs * 0.6);
  g.font = `700 ${fs * 0.85}px ui-monospace, monospace`;
  const dw = g.measureText(date).width + pad * 2;
  g.fillStyle = 'rgba(255,255,255,0.95)';
  pill(g, w - b - 12 * k - dw, h - b - 12 * k - fs * 2, dw, fs * 2);
  g.fillStyle = '#45323d';
  g.fillText(date, w - b - 12 * k - dw + pad, h - b - 12 * k - fs * 0.65);
  return new Promise((resolve) => out.toBlob(resolve, 'image/png'));
}

function pill(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  g.beginPath();
  g.roundRect(x, y, w, h, h / 2);
  g.fill();
}
