'use client';

import { useState } from 'react';
import { ListChecks, Plus, Timer, Trophy } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { formatLeft, type usePomodoro } from './usePomodoro';

type Tab = 'focus' | 'todo' | 'today';

const RANKS = [
  ['Jod', '2h 10m'],
  ['Mai', '1h 32m'],
  ['feifei (you)', '50m'],
  ['Ploy', '15m'],
];

/**
 * Study session: your Pomodoro, to-do and today's focus ranking in one card, because they're all part
 * of studying. Music has its own toolbar button (you often want music without studying).
 */
export function StudyPanel({
  pomo,
  subject,
  onSubject,
  className,
}: {
  pomo: ReturnType<typeof usePomodoro>;
  subject: string;
  onSubject: (s: string) => void;
  className?: string;
}) {
  const [tab, setTab] = useState<Tab>('focus');
  const [todos, setTodos] = useState([
    { text: 'Read chapter 7', done: true },
    { text: 'Calculus exercises 1–10', done: false },
    { text: 'OS flashcards', done: false },
  ]);
  const [draft, setDraft] = useState('');
  const left = todos.filter((t) => !t.done).length;

  return (
    <section className={cn('panel flex flex-col gap-3 p-3', className)} aria-label="Study session">
      <div className="flex items-baseline gap-2 px-1">
        <h2 className="flex-1 text-sm font-black">Study session</h2>
        <span className="text-[11px] text-muted-foreground">only you see this</span>
      </div>
      <div className="grid grid-cols-3 gap-1 rounded-2xl bg-muted p-1">
        {(
          [
            ['focus', 'Timer', Timer],
            ['todo', 'To-do', ListChecks],
            ['today', 'Today', Trophy],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'flex items-center justify-center gap-1.5 rounded-xl py-1.5 text-xs font-bold',
              tab === id ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="size-3.5" />
            {label}
            {id === 'todo' && left > 0 && (
              <span className="rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">{left}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'focus' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-br from-secondary to-peach p-3">
            <div className="relative grid size-16 flex-none place-items-center">
              <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="3" className="text-card/70" />
                <circle
                  cx="18"
                  cy="18"
                  r="15.5"
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${pomo.progress * 97.4} 97.4`}
                />
              </svg>
              <span className="text-2xl">{pomo.phase === 'focus' ? '📖' : pomo.phase === 'break' ? '☕' : '🍅'}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-muted-foreground">
                {pomo.phase === 'focus' ? 'Focusing' : pomo.phase === 'break' ? 'Break time' : 'Not started'}
              </p>
              <p className="font-mono text-3xl font-black tabular-nums">
                {pomo.phase === 'idle' ? `${pomo.preset[0]}:00` : formatLeft(pomo.left)}
              </p>
            </div>
          </div>
          {pomo.phase === 'idle' ? (
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  [25, 5],
                  [50, 10],
                ] as [number, number][]
              ).map((p) => (
                <button
                  key={p[0]}
                  onClick={() => pomo.start(p)}
                  className="rounded-xl bg-primary py-2 text-sm font-extrabold text-primary-foreground hover:bg-primary-ink"
                >
                  ▶ {p[0]} / {p[1]} min
                </button>
              ))}
            </div>
          ) : (
            <button onClick={pomo.stop} className="rounded-xl border py-2 text-sm font-bold hover:bg-muted">
              Stop
            </button>
          )}
          <label className="flex flex-col gap-1 text-xs font-bold text-muted-foreground">
            Studying (shown above your head)
            <Input
              value={subject}
              onChange={(e) => onSubject(e.target.value)}
              maxLength={24}
              placeholder="e.g. Calculus"
              className="h-9 rounded-xl"
            />
          </label>
        </div>
      )}

      {tab === 'todo' && (
        <div className="flex flex-col gap-2">
          {todos.map((t, i) => (
            <label key={i} className="flex items-center gap-2 rounded-xl px-1 py-1 text-sm font-semibold hover:bg-muted/60">
              <Checkbox checked={t.done} onCheckedChange={(v) => setTodos(todos.map((x, j) => (j === i ? { ...x, done: !!v } : x)))} />
              <span className={cn(t.done && 'text-muted-foreground line-through')}>{t.text}</span>
            </label>
          ))}
          <form
            className="flex gap-1"
            onSubmit={(e) => {
              e.preventDefault();
              if (draft.trim()) setTodos([...todos, { text: draft.trim(), done: false }]);
              setDraft('');
            }}
          >
            <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add a task" className="h-9 rounded-xl" />
            <button className="grid size-9 flex-none place-items-center rounded-xl bg-primary text-primary-foreground" aria-label="Add">
              <Plus className="size-4" />
            </button>
          </form>
        </div>
      )}
      {tab === 'today' && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold text-muted-foreground">Focus in this room today</p>
          <ol className="flex flex-col gap-1">
            {RANKS.map(([name, time], i) => (
              <li
                key={name}
                className={cn('flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm', name!.includes('you') && 'bg-secondary font-bold')}
              >
                <span className="w-5 text-center">{['🥇', '🥈', '🥉'][i] ?? i + 1}</span>
                <span className="flex-1">{name}</span>
                <span className="font-mono text-xs text-muted-foreground">{time}</span>
              </li>
            ))}
          </ol>
          <p className="text-[11px] text-muted-foreground">Counts finished focus stretches of 1 minute or more. 🔥 5-day streak.</p>
        </div>
      )}
    </section>
  );
}
