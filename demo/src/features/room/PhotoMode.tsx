'use client';

import { useState } from 'react';
import { Camera, X } from 'lucide-react';
import { toast } from 'sonner';
import { LogoMark } from '@/components/Logo';
import { cn } from '@/lib/utils';

const FRAMES = [
  { id: 'white', label: 'White', border: 'border-white', swatch: '#ffffff' },
  { id: 'pink', label: 'Strawberry', border: 'border-[#ffd2e3]', swatch: '#ffd2e3' },
  { id: 'cocoa', label: 'Cocoa', border: 'border-[#4a3443]', swatch: '#4a3443' },
] as const;

/**
 * Photo mode from anywhere: the HUD hides, a frame with the logo appears, you can still drag the
 * camera around, then snap. Others would see a 📸 over your head so they can pose.
 */
export function PhotoMode({ roomName, onClose }: { roomName: string; onClose: () => void }) {
  const [frame, setFrame] = useState<(typeof FRAMES)[number]['id']>('white');
  const [flash, setFlash] = useState(0);
  const f = FRAMES.find((x) => x.id === frame)!;
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="pointer-events-none absolute inset-0 z-30">
      <div
        className={cn('absolute inset-x-4 top-4 bottom-28 rounded-[28px] border-[12px] shadow-[0_0_0_9999px_rgb(30_18_28/0.5)]', f.border)}
      >
        <span className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-white/95 py-1 pr-3 pl-1.5 text-sm font-black text-[#45323d]">
          <LogoMark size={22} /> Connecta · {roomName}
        </span>
        <span className="absolute right-3 bottom-3 rounded-full bg-white/95 px-3 py-1 font-mono text-xs font-bold text-[#45323d]">
          {date}
        </span>
      </div>
      <div className="pointer-events-auto absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-4">
        <button onClick={onClose} className="flex items-center gap-1 rounded-full bg-card px-4 py-2 text-sm font-bold shadow-soft">
          <X className="size-4" /> Close
        </button>
        <button
          onClick={() => {
            setFlash((n) => n + 1);
            toast.success('Saved to your photos 📸');
          }}
          className="grid size-[68px] place-items-center rounded-full bg-white text-[#df6392] shadow-[0_0_0_5px_rgb(255_255_255/0.45),0_10px_26px_rgb(0_0_0/0.3)]"
          aria-label="Take photo"
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
              className={cn('size-7 rounded-full border-[3px] border-card', frame === x.id ? 'ring-2 ring-primary' : 'ring-1 ring-border')}
              style={{ background: x.swatch }}
            />
          ))}
        </div>
      </div>
      {flash > 0 && <div key={flash} className="camera-flash absolute inset-0 bg-white opacity-0" />}
    </div>
  );
}
