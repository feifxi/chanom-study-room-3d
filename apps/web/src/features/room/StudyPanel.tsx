'use client';

import { useState } from 'react';
import { ListChecks, Plus, Timer, Trophy, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { formatMinutes, TODO_LIMIT, useRoomToday, useTodos } from '@/lib/focus';
import { ME } from '@/lib/mock';
import { formatLeft, type usePomodoro } from './usePomodoro';
import { LeaveRoomLink } from './LeaveRoom';

type Tab = 'focus' | 'todo' | 'today';

/**
 * Study session: your Pomodoro, to-do and today's focus ranking in one card, because they're all part
 * of studying. Music has its own toolbar button (you often want music without studying).
 * The to-do list is your account's, the same in every room; guests get the timer only.
 */
export function StudyPanel({
  roomId,
  guest = false,
  pomo,
  subject,
  onSubject,
  className,
}: {
  roomId: string;
  guest?: boolean;
  pomo: ReturnType<typeof usePomodoro>;
  subject: string;
  onSubject: (s: string) => void;
  className?: string;
}) {
  const [tab, setTab] = useState<Tab>('focus');
  const { todos, left, full, add, toggle, remove, clearDone } = useTodos();
  const ranks = useRoomToday(roomId);
  const [draft, setDraft] = useState('');

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
            {id === 'todo' && !guest && left > 0 && (
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

      {tab === 'todo' &&
        (guest ? (
          <GuestNote what="a to-do list that follows you into every room" />
        ) : (
          <div className="flex flex-col gap-2">
            {todos.length === 0 && <p className="px-1 text-sm text-muted-foreground">Nothing yet. What’s first?</p>}
            <ul className="flex max-h-56 flex-col gap-0.5 overflow-y-auto">
              {todos.map((t) => (
                <li key={t.id} className="group flex items-center gap-2 rounded-xl px-1 py-1 text-sm font-semibold hover:bg-muted/60">
                  <Checkbox id={`todo-${t.id}`} checked={t.done} onCheckedChange={() => toggle(t.id)} />
                  <label
                    htmlFor={`todo-${t.id}`}
                    className={cn('min-w-0 flex-1 break-words', t.done && 'text-muted-foreground line-through')}
                  >
                    {t.text}
                  </label>
                  <button
                    onClick={() => remove(t.id)}
                    aria-label={`Delete ${t.text}`}
                    className="grid size-6 place-items-center rounded-lg text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-card focus-visible:opacity-100"
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
            <form
              className="flex gap-1"
              onSubmit={(e) => {
                e.preventDefault();
                add(draft);
                setDraft('');
              }}
            >
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={120}
                disabled={full}
                placeholder={full ? `Full (${TODO_LIMIT}). Clear some done ones` : 'Add a task'}
                className="h-9 rounded-xl"
              />
              <button className="grid size-9 flex-none place-items-center rounded-xl bg-primary text-primary-foreground" aria-label="Add">
                <Plus className="size-4" />
              </button>
            </form>
            <div className="flex items-center justify-between px-1 text-[11px] text-muted-foreground">
              <span>Saved to your account, in every room</span>
              {todos.some((t) => t.done) && (
                <button onClick={clearDone} className="font-bold hover:text-foreground">
                  Clear done
                </button>
              )}
            </div>
          </div>
        ))}
      {tab === 'today' && (
        <div className="flex flex-col gap-2">
          <p className="px-1 text-xs font-bold text-muted-foreground">Focus in this room today</p>
          {ranks.length === 0 ? (
            <p className="px-1 text-sm text-muted-foreground">Nobody yet. Start a timer and you’re first.</p>
          ) : (
            <ol className="flex flex-col gap-1">
              {ranks.map((r, i) => (
                <li
                  key={r.user.id}
                  className={cn('flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm', r.user.id === ME.id && 'bg-secondary font-bold')}
                >
                  <span className="w-5 text-center">{['🥇', '🥈', '🥉'][i] ?? i + 1}</span>
                  <span className="flex-1 truncate">
                    {r.user.name}
                    {r.user.id === ME.id && ' (you)'}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">{formatMinutes(r.minutes)}</span>
                </li>
              ))}
            </ol>
          )}
          <p className="px-1 text-[11px] text-muted-foreground">
            Counts focus rounds of 1 minute or more, here today. Your week and friends are on the Focus page.
          </p>
        </div>
      )}
    </section>
  );
}

/** Guests have no account, so nothing is saved for them. */
function GuestNote({ what }: { what: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl bg-muted p-4 text-center">
      <p className="text-sm font-semibold">Sign up to keep {what}.</p>
      <LeaveRoomLink
        href="/login?from=guest"
        className="rounded-full bg-primary px-4 py-1.5 text-xs font-extrabold text-primary-foreground"
      >
        Sign up, keep your character
      </LeaveRoomLink>
    </div>
  );
}
