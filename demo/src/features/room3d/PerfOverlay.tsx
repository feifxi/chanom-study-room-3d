'use client';

import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { PERF_BUDGET, budgetFor, perfMeter, usePerfSample } from './perf';

/**
 * Developer overlay: frame rate, our JavaScript time per frame, the worst stutter, and what the GPU
 * was asked to draw, against the budget. Red means over budget.
 */
export function PerfOverlay({ fpsCap, mode }: { fpsCap: number; mode: string }) {
  const s = usePerfSample();
  // For scripts/perf-check.mjs: the latest sample and the budget it's checked against
  useEffect(() => {
    const w = window as unknown as { __perf?: unknown };
    w.__perf = { sample: () => perfMeter.sample, budgetFor, budget: PERF_BUDGET };
    return () => void delete w.__perf;
  }, []);
  if (!s) return null;
  const b = budgetFor(s.avatars);
  const rows: [string, string, boolean][] = [
    ['FPS', `${s.fps} / ${fpsCap}`, s.fps < fpsCap * 0.85],
    ['JS / frame', `${s.cpuMs.toFixed(1)} ms`, s.cpuMs > PERF_BUDGET.cpuMs],
    ['Worst frame', `${Math.round(s.worstMs)} ms`, s.worstMs > 1000 / (fpsCap / 2)],
    ['Draw calls', `${s.drawCalls} / ${b.drawCalls}`, s.drawCalls > b.drawCalls],
    ['Triangles', `${k(s.triangles)} / ${k(b.triangles)}`, s.triangles > b.triangles],
    ['Textures', `${s.textures} / ${b.textures}`, s.textures > b.textures],
    ['Shaders', `${s.programs} / ${PERF_BUDGET.programs}`, s.programs > PERF_BUDGET.programs],
    ['Geometries', String(s.geometries), false],
    ['People · labels', `${s.avatars} · ${s.labels}`, false],
  ];
  return (
    <div
      className="pointer-events-none rounded-xl bg-black/75 px-3 py-2 font-mono text-[11px] leading-[1.55] text-white tabular-nums"
      aria-label="Performance"
    >
      <p className="mb-0.5 font-bold text-white/60">Performance · {mode}</p>
      <p className="mb-1 text-[10px] text-white/50">Budget: the map’s share + each person’s</p>
      {rows.map(([label, value, over]) => (
        <p key={label} className="flex justify-between gap-4">
          <span className="text-white/70">{label}</span>
          <span className={cn(over && 'font-bold text-red-300')}>{value}</span>
        </p>
      ))}
    </div>
  );
}

const k = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(n));
