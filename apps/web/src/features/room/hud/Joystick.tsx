'use client';

import { useRef, useState } from 'react';

const RADIUS = 44; // px the knob can travel from the centre

/**
 * On-screen joystick for touch screens. Reports -1..1 per axis (x right, z down the screen), the
 * same convention as the arrow keys; push it all the way to run.
 */
export function Joystick({ onMove, className = '' }: { onMove: (x: number, z: number) => void; className?: string }) {
  const base = useRef<HTMLDivElement>(null);
  const active = useRef<number | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });

  const update = (e: React.PointerEvent) => {
    const r = base.current!.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2);
    let dy = e.clientY - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy);
    if (d > RADIUS) {
      dx = (dx / d) * RADIUS;
      dy = (dy / d) * RADIUS;
    }
    setKnob({ x: dx, y: dy });
    // A small dead zone so resting a thumb on it doesn't creep
    const m = Math.min(1, d / RADIUS);
    onMove(m < 0.15 ? 0 : dx / RADIUS, m < 0.15 ? 0 : dy / RADIUS);
  };
  const end = () => {
    active.current = null;
    setKnob({ x: 0, y: 0 });
    onMove(0, 0);
  };

  return (
    <div
      ref={base}
      role="application"
      aria-label="Movement joystick"
      className={`grid size-28 touch-none place-items-center rounded-full border border-white/60 bg-white/35 shadow-lg backdrop-blur-sm select-none ${className}`}
      onPointerDown={(e) => {
        if (active.current !== null) return;
        active.current = e.pointerId;
        try {
          // Keep getting moves when the thumb slides off the joystick
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // The pointer is already gone (lifted at once); nothing to capture
        }
        update(e);
      }}
      onPointerMove={(e) => e.pointerId === active.current && update(e)}
      onPointerUp={(e) => e.pointerId === active.current && end()}
      onPointerCancel={(e) => e.pointerId === active.current && end()}
    >
      <div
        className="size-12 rounded-full bg-accent/90 shadow-md ring-4 ring-white/70"
        style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
      />
    </div>
  );
}
