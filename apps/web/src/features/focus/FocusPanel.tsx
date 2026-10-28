'use client';

import { useState } from 'react';
import { POMODORO_PRESETS, SUBJECT_MAX, type PlayerView, type TimerPhase } from '@study/shared';
import { minutesSince, useNow } from '@/lib/time';
import type { StudyRoom } from '../room/roomSession';
import { STATUS_ICON } from './status';
import { formatCountdown, useAutoAway, usePersonalTimer } from './usePersonalTimer';

const PHASE_LABEL: Record<TimerPhase, string> = { idle: 'Idle', focus: 'Focus', break: 'Break' };

export function FocusPanel({ room, clockOffset }: { room: StudyRoom; clockOffset: number }) {
  const now = useNow(250) + clockOffset;
  useAutoAway(room);
  const { timer, start, stop } = usePersonalTimer(room, clockOffset);
  const [subject, setSubject] = useState('');

  const me: PlayerView | undefined = room.state.players?.get(room.sessionId);
  if (!me) return null;
  const running = timer.phase !== 'idle';
  const countdown = me.status === 'focus' || me.status === 'break' ? formatCountdown(me.statusEndsAt - now) : '--:--';
  const focusedFor = minutesSince(me.focusSince, now);

  const headline =
    me.status === 'focus' ? 'Focusing' : me.status === 'break' ? 'On a break' : me.status === 'away' ? 'Away' : 'Not started';
  const detail =
    me.status === 'focus'
      ? `Focused ${focusedFor} min · round ${timer.cycle + 1}`
      : me.status === 'break'
        ? `Round ${timer.cycle + 1} done, nice!`
        : running
          ? `${PHASE_LABEL[timer.phase]} paused while away`
          : 'Pick a timer to start';

  return (
    <section className="panel absolute top-4 right-4 flex w-72 flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-extrabold tracking-wider text-muted uppercase">Pomodoro</span>
        <button
          onClick={() => room.send('away', { on: me.status !== 'away' })}
          className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${me.status === 'away' ? 'border-accent bg-accent text-white' : 'border-line bg-white'}`}
        >
          💤 Away
        </button>
      </div>

      <div className="flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-bold">
            {STATUS_ICON[me.status] ?? '🙂'} {headline}
          </p>
          <p className="truncate text-xs text-muted">{detail}</p>
        </div>
        <span className="font-mono text-3xl font-bold tabular-nums">{countdown}</span>
      </div>

      {running ? (
        <div className="flex items-center gap-2">
          <p className="flex-1 text-xs text-muted">
            {timer.focusMin} min focus / {timer.breakMin} min break · others can see how long you&apos;ve focused
          </p>
          <button onClick={stop} className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-bold">
            Stop
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {POMODORO_PRESETS.map((p) => (
            <button
              key={p.focus}
              onClick={() => start(p.focus, p.break)}
              className="rounded-lg bg-accent px-3 py-2 text-sm font-bold text-white shadow-sm shadow-accent/30"
            >
              ▶ {p.focus} / {p.break} min
            </button>
          ))}
        </div>
      )}

      <label className="flex flex-col gap-1 text-xs font-bold text-muted">
        Studying
        <input
          value={subject}
          maxLength={SUBJECT_MAX}
          placeholder="e.g. Calculus, English"
          onChange={(e) => setSubject(e.target.value)}
          onBlur={() => room.send('subject', { text: subject })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          }}
          className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-sm font-semibold text-ink outline-none focus:border-accent"
        />
      </label>
    </section>
  );
}
