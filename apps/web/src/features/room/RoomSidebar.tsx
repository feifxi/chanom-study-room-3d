'use client';

import type { PlayerView } from '@study/shared';
import { useNow } from '@/lib/time';
import { STATUS_ICON } from '../focus/status';
import { TodoPanel } from '../todo/TodoPanel';
import { formatMinutes } from '../stats/useStats';
import type { ReactNode } from 'react';
import { Music2, Timer } from 'lucide-react';
import { MusicPanel } from '../music/MusicPanel';
import type { Music } from '../music/useMusic';
import { IconRail, RAIL_ICONS } from './hud/IconRail';
import type { StudyRoom } from './roomSession';

interface Props {
  room: StudyRoom;
  music: Music;
  /** Phone layout: the rail runs along the top and also holds the Pomodoro. */
  compact?: boolean;
  touch?: boolean;
  pomodoro?: ReactNode;
}

/** The left rail: your to-do list, music, today's ranking in this room, and help. */
export function RoomSidebar({ room, music, compact = false, touch = false, pomodoro }: Props) {
  return (
    <IconRail
      compact={compact}
      items={[
        ...(compact && pomodoro ? [{ id: 'pomodoro', icon: Timer, label: 'Pomodoro', keepMounted: true, render: () => pomodoro }] : []),
        { id: 'todo', icon: RAIL_ICONS.todo, label: 'To-do', keepMounted: true, render: () => <TodoPanel /> },
        { id: 'music', icon: Music2, label: 'Music', render: () => <MusicPanel music={music} /> },
        { id: 'ranks', icon: RAIL_ICONS.ranks, label: 'Focus today', render: () => <RanksPanel room={room} /> },
        { id: 'help', icon: RAIL_ICONS.help, label: 'How to play', render: () => <HelpPanel touch={touch} /> },
      ]}
    />
  );
}

/** Everyone in this room, ranked by focus minutes today. */
function RanksPanel({ room }: { room: StudyRoom }) {
  useNow(2000); // synced state changes without React noticing; re-read it every 2 s
  const rows: (PlayerView & { id: string })[] = [];
  room.state.players?.forEach((p, id) => rows.push({ ...p, id, name: p.name, todayMin: p.todayMin, status: p.status }));
  rows.sort((a, b) => b.todayMin - a.todayMin);
  return (
    <div className="panel flex flex-col gap-3 p-4">
      <h2 className="text-sm font-extrabold">Focus today</h2>
      <ol className="flex max-h-64 flex-col gap-1.5 overflow-y-auto text-sm">
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

const KEYS: [string, string][] = [
  ['WASD / arrows', 'Walk (Shift to run)'],
  ['E', 'Sit or stand, pet a cat, use the Buddy Machine'],
  ['Enter', 'Chat'],
  ['Drag / scroll', 'Turn the camera / zoom'],
];

const TOUCH: [string, string][] = [
  ['Joystick', 'Walk'],
  ['Button', 'Sit, stand up, pet, open the machine'],
  ['Drag / pinch', 'Turn the camera / zoom'],
];

function HelpPanel({ touch }: { touch: boolean }) {
  return (
    <div className="panel flex flex-col gap-3 p-4">
      <h2 className="text-sm font-extrabold">How to play</h2>
      <dl className="flex flex-col gap-2 text-xs">
        {(touch ? TOUCH : KEYS).map(([k, v]) => (
          <div key={k} className="flex items-start gap-2">
            <dt className="flex-none rounded-md border border-line bg-soft px-1.5 py-0.5 font-mono font-bold">{k}</dt>
            <dd className="pt-0.5 text-muted">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="text-xs leading-relaxed text-muted">
        Turn your mic on in the dock: the closer people stand, the louder they are. Sit at a table to share your screen with that table.
      </p>
    </div>
  );
}
