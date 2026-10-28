'use client';

import { useEffect, useState } from 'react';
import { POMODORO_PRESETS, SUBJECT_MAX, type PlayerView, type TimerPhase } from '@study/shared';
import type { StudyRoom } from '../room/useStudyRoom';
import { formatCountdown, useAutoAway, usePersonalTimer } from './usePersonalTimer';

export const STATUS_ICON: Record<string, string> = { focus: '📖', break: '☕', away: '💤' };
const PHASE_LABEL: Record<TimerPhase, string> = { idle: 'ว่าง', focus: 'โฟกัส', break: 'พัก' };

/** Re-render on an interval (for countdowns and synced state that React doesn't see). */
export function useTick(ms: number) {
  const [, setN] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setN((n) => n + 1), ms);
    return () => clearInterval(id);
  }, [ms]);
}

export function FocusPanel({ room, clockOffset }: { room: StudyRoom; clockOffset: number }) {
  useTick(250);
  useAutoAway(room);
  const personal = usePersonalTimer(room, clockOffset);
  const [tab, setTab] = useState<'room' | 'personal'>('room');
  const [subject, setSubject] = useState('');

  const me: PlayerView | undefined = room.state.players?.get(room.sessionId);
  const timer = room.state.timer;
  if (!me || !timer) return null;
  const now = Date.now() + clockOffset;
  const following = me.timerMode === 'room';

  // What drives the big countdown: whatever timer your status follows
  const countdown =
    me.status === 'focus' || me.status === 'break' ? formatCountdown(me.statusEndsAt - now) : '--:--';

  const sendSubject = () => room.send('subject', { text: subject });

  return (
    <section className="panel absolute top-4 right-4 flex w-72 flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-extrabold tracking-wider text-muted uppercase">Pomodoro</span>
        <button
          onClick={() => room.send('away', { on: me.status !== 'away' })}
          className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${me.status === 'away' ? 'border-accent bg-accent text-white' : 'border-line bg-white'}`}
        >
          💤 ไม่อยู่
        </button>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm font-bold">
            {STATUS_ICON[me.status] ?? '🙂'} {me.status === 'focus' ? 'กำลังโฟกัส' : me.status === 'break' ? 'พักก่อน' : me.status === 'away' ? 'ไม่อยู่' : 'ยังไม่จับเวลา'}
          </p>
          <p className="text-xs text-muted">
            {following ? `ตามเวลาห้อง · รอบที่ ${timer.cycle + 1}` : me.timerMode === 'personal' ? `จับเวลาเอง · รอบที่ ${personal.timer.cycle + 1}` : 'เลือกโหมดด้านล่าง'}
          </p>
        </div>
        <span className="font-mono text-3xl font-bold tabular-nums">{countdown}</span>
      </div>

      <div className="grid grid-cols-2 gap-1 rounded-xl bg-soft p-1 text-sm font-bold">
        {(['room', 'personal'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-lg py-1 ${tab === t ? 'bg-white shadow-sm' : 'text-muted'}`}>
            {t === 'room' ? 'ทั้งห้อง' : 'ส่วนตัว'}
          </button>
        ))}
      </div>

      {tab === 'room' ? (
        timer.phase === 'idle' ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-muted">ยังไม่มีใครเริ่ม เริ่มจับเวลาให้ทั้งห้องได้เลย</p>
            <Presets onPick={(f, b) => room.send('timer:start', { focusMin: f, breakMin: b })} />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-muted">
              ห้องกำลัง{PHASE_LABEL[timer.phase as TimerPhase]} · เหลือ {formatCountdown(timer.endsAt - now)} · {timer.focusMin}/{timer.breakMin} นาที
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (!following && me.timerMode === 'personal') personal.stop();
                  room.send('timer:mode', { mode: following ? 'none' : 'room' });
                }}
                className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-bold ${following ? 'border border-line bg-white' : 'bg-accent text-white'}`}
              >
                {following ? 'เลิกตาม' : 'ร่วมจับเวลา'}
              </button>
              <button onClick={() => room.send('timer:stop', {})} className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-bold">
                หยุดทั้งห้อง
              </button>
            </div>
          </div>
        )
      ) : personal.timer.phase === 'idle' || me.timerMode !== 'personal' ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted">จับเวลาของตัวเอง คนอื่นจะเห็นสถานะบนหัวคุณ</p>
          <Presets onPick={personal.start} />
        </div>
      ) : (
        <div className="flex gap-2">
          <p className="flex-1 text-xs text-muted">
            {PHASE_LABEL[personal.timer.phase]} · {personal.timer.focusMin}/{personal.timer.breakMin} นาที
          </p>
          <button onClick={personal.stop} className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-bold">
            หยุด
          </button>
        </div>
      )}

      <label className="flex flex-col gap-1 text-xs font-bold text-muted">
        กำลังอ่าน
        <input
          value={subject}
          maxLength={SUBJECT_MAX}
          placeholder="เช่น Calculus, ภาษาอังกฤษ"
          onChange={(e) => setSubject(e.target.value)}
          onBlur={sendSubject}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          }}
          className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-sm font-semibold text-ink outline-none focus:border-accent"
        />
      </label>
    </section>
  );
}

function Presets({ onPick }: { onPick: (focusMin: number, breakMin: number) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {POMODORO_PRESETS.map((p) => (
        <button
          key={p.focus}
          onClick={() => onPick(p.focus, p.break)}
          className="rounded-lg bg-accent px-3 py-2 text-sm font-bold text-white shadow-sm shadow-accent/30 hover:brightness-105"
        >
          ▶ {p.focus}/{p.break} นาที
        </button>
      ))}
    </div>
  );
}
