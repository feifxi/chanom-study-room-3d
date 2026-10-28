'use client';

import { useState } from 'react';
import type { PlayerView } from '@study/shared';
import { useNow } from '@/lib/time';
import { STATUS_ICON } from '../focus/status';
import { TodoPanel } from '../todo/TodoPanel';
import { formatMinutes } from '../stats/useStats';
import type { StudyRoom } from './roomSession';

type Tab = 'todo' | 'ranks' | 'help';

/** Toolbar under the room header that opens one small panel at a time. */
export function RoomSidebar({ room }: { room: StudyRoom }) {
  const [tab, setTab] = useState<Tab | null>(null);
  const tabs: { id: Tab; label: string }[] = [
    { id: 'todo', label: '📝 To-do' },
    { id: 'ranks', label: '🏆 Today' },
    { id: 'help', label: '❔' },
  ];
  return (
    <div className="absolute top-20 left-4 flex w-72 flex-col gap-2">
      <div className="flex gap-1.5">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(tab === t.id ? null : t.id)}
            className={`rounded-full border px-3 py-1 text-xs font-bold whitespace-nowrap shadow-sm ${tab === t.id ? 'border-accent bg-accent text-white' : 'border-line bg-white/90'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {/* The to-do panel stays mounted so a half-typed item survives switching tabs */}
      <div className={tab === 'todo' ? '' : 'hidden'}>
        <TodoPanel />
      </div>
      {tab === 'ranks' && <RanksPanel room={room} />}
      {tab === 'help' && (
        <div className="panel p-3 text-xs leading-relaxed text-muted">
          WASD / arrows to walk · Shift to run · E to sit/stand · Enter to chat · drag to orbit · scroll to zoom
          <br />
          Turn your mic on at the bottom right; the closer people stand, the louder they are. Sit at a table to share your screen with that
          table.
        </div>
      )}
    </div>
  );
}

/** Everyone in this room, ranked by focus minutes today. */
function RanksPanel({ room }: { room: StudyRoom }) {
  useNow(2000); // synced state changes without React noticing; re-read it every 2 s
  const rows: (PlayerView & { id: string })[] = [];
  room.state.players?.forEach((p, id) => rows.push({ ...p, id, name: p.name, todayMin: p.todayMin, status: p.status }));
  rows.sort((a, b) => b.todayMin - a.todayMin);
  return (
    <div className="panel flex flex-col gap-2 p-3">
      <span className="text-xs font-extrabold tracking-wider text-muted uppercase">Focus today in this room</span>
      <ol className="flex max-h-64 flex-col gap-1 overflow-y-auto text-sm">
        {rows.map((r, i) => (
          <li key={r.id} className={`flex items-center gap-2 ${r.id === room.sessionId ? 'font-bold' : ''}`}>
            <span className="w-5 text-center">{['🥇', '🥈', '🥉'][i] ?? i + 1}</span>
            <span className="min-w-0 flex-1 truncate">
              {r.name}
              {r.id === room.sessionId && ' (you)'} {STATUS_ICON[r.status] ?? ''}
            </span>
            <span className="font-mono text-xs text-muted">{formatMinutes(r.todayMin)}</span>
          </li>
        ))}
      </ol>
      <p className="text-[11px] text-muted">Counts finished focus stretches of 1 minute or more.</p>
    </div>
  );
}
