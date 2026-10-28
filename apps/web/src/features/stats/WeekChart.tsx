'use client';

import { useState } from 'react';
import { formatMinutes } from './useStats';

const W = 280;
const H = 120;
const PAD = { top: 18, right: 8, bottom: 20, left: 8 };
const BAR = 22; // ≤ 24px thick, never fills the slot
const BAR_COLOR = '#e0457b';
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Focus minutes for the last 7 days: one series, so no legend; today is labelled. */
export function WeekChart({ days }: { days: { date: string; minutes: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(30, ...days.map((d) => d.minutes));
  const plotH = H - PAD.top - PAD.bottom;
  const slot = (W - PAD.left - PAD.right) / days.length;
  const y = (m: number) => PAD.top + plotH - (m / max) * plotH;
  const base = PAD.top + plotH;

  return (
    <figure className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Focus time over the last 7 days">
        {/* Recessive hairline baseline */}
        <line x1={PAD.left} x2={W - PAD.right} y1={base} y2={base} stroke="var(--line)" strokeWidth={1} />
        {days.map((d, i) => {
          const cx = PAD.left + slot * i + slot / 2;
          const top = y(d.minutes);
          const h = base - top;
          const isToday = i === days.length - 1;
          const weekday = DAYS[new Date(`${d.date}T12:00:00+07:00`).getDay()]!;
          return (
            <g key={d.date} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)}>
              {/* Generous hit target: the whole column slot */}
              <rect x={cx - slot / 2} y={PAD.top} width={slot} height={plotH + PAD.bottom} fill="transparent" />
              {d.minutes > 0 && (
                // 4px rounded data-end, square at the baseline
                <path
                  d={`M${cx - BAR / 2},${base} V${top + Math.min(4, h)} Q${cx - BAR / 2},${top} ${cx - BAR / 2 + Math.min(4, h)},${top} H${cx + BAR / 2 - Math.min(4, h)} Q${cx + BAR / 2},${top} ${cx + BAR / 2},${top + Math.min(4, h)} V${base} Z`}
                  fill={BAR_COLOR}
                  opacity={hover === null || hover === i ? 1 : 0.55}
                />
              )}
              {isToday && (
                <text x={cx} y={Math.min(top, base) - 5} textAnchor="middle" className="fill-ink text-[10px] font-bold">
                  {d.minutes}
                </text>
              )}
              <text x={cx} y={H - 5} textAnchor="middle" className={`text-[10px] ${isToday ? 'fill-ink font-bold' : 'fill-muted'}`}>
                {isToday ? 'Today' : weekday}
              </text>
            </g>
          );
        })}
      </svg>
      {hover !== null && days[hover] && (
        <div
          className="pointer-events-none absolute -top-2 rounded-lg bg-ink px-2 py-1 text-xs whitespace-nowrap text-white shadow"
          style={{ left: `${((PAD.left + slot * hover + slot / 2) / W) * 100}%`, transform: 'translate(-50%, -100%)' }}
        >
          {new Date(`${days[hover].date}T12:00:00+07:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} ·{' '}
          {formatMinutes(days[hover].minutes)}
        </div>
      )}
      {/* Table view for screen readers */}
      <table className="sr-only">
        <caption>Daily focus time</caption>
        <tbody>
          {days.map((d) => (
            <tr key={d.date}>
              <th scope="row">{d.date}</th>
              <td>{d.minutes} minutes</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
