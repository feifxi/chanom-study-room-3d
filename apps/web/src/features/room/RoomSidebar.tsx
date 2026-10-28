'use client';

import { useEffect, useRef, useState } from 'react';
import type { PlayerView } from '@study/shared';
import { AMBIENT_SOUNDS, AmbientEngine, type AmbientSound } from '../ambient/ambient';
import { STATUS_ICON, useTick } from '../focus/FocusPanel';
import { formatMinutes } from '../stats/useStats';
import type { StudyRoom } from './useStudyRoom';

type Tab = 'todo' | 'ranks' | 'ambient' | 'help';

/** Toolbar under the room header that opens one small panel at a time. */
export function RoomSidebar({ room }: { room: StudyRoom }) {
  const [tab, setTab] = useState<Tab | null>(null);
  const tabs: { id: Tab; label: string }[] = [
    { id: 'todo', label: '📝 To-do' },
    { id: 'ranks', label: '🏆 วันนี้' },
    { id: 'ambient', label: '🎧 เสียง' },
    { id: 'help', label: '❔' },
  ];
  return (
    <div className="absolute top-20 left-4 flex w-72 flex-col gap-2">
      <div className="flex gap-1.5">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(tab === t.id ? null : t.id)}
            className={`rounded-full border px-3 py-1 text-xs font-bold shadow-sm ${tab === t.id ? 'border-accent bg-accent text-white' : 'border-line bg-white/90'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {/* Panels stay mounted so the to-do draft and ambient sound survive switching tabs */}
      <div className={tab === 'todo' ? '' : 'hidden'}>
        <TodoPanel />
      </div>
      {tab === 'ranks' && <RanksPanel room={room} />}
      <div className={tab === 'ambient' ? '' : 'hidden'}>
        <AmbientPanel />
      </div>
      {tab === 'help' && (
        <div className="panel p-3 text-xs leading-relaxed text-muted">
          WASD / ลูกศร เดิน · Shift วิ่ง · E นั่ง/ลุก · Enter แชท · ลากเมาส์หมุนกล้อง · Scroll ซูม
          <br />
          เปิดไมค์ได้ที่มุมขวาล่าง ยิ่งยืนใกล้ยิ่งได้ยินชัด · นั่งที่โต๊ะแล้วแชร์จอขึ้นโน้ตบุ๊กได้
        </div>
      )}
    </div>
  );
}

interface Todo {
  id: string;
  text: string;
  done: boolean;
}
const TODO_KEY = 'chanom-study:todos';

function loadTodos(): Todo[] {
  try {
    const raw = JSON.parse(localStorage.getItem(TODO_KEY) ?? '[]');
    return Array.isArray(raw) ? raw.filter((t) => t && typeof t.text === 'string').slice(0, 50) : [];
  } catch {
    return [];
  }
}

/** Private checklist kept in this browser only. */
function TodoPanel() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [text, setText] = useState('');
  const loaded = useRef(false);
  useEffect(() => {
    setTodos(loadTodos());
    loaded.current = true;
  }, []);
  useEffect(() => {
    if (!loaded.current) return;
    try {
      localStorage.setItem(TODO_KEY, JSON.stringify(todos));
    } catch {}
  }, [todos]);

  const left = todos.filter((t) => !t.done).length;
  return (
    <div className="panel flex flex-col gap-2 p-3">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-extrabold tracking-wider text-muted uppercase">สิ่งที่ต้องทำ</span>
        <span className="text-xs text-muted">{todos.length ? `เหลือ ${left}/${todos.length}` : 'เห็นแค่คุณคนเดียว'}</span>
      </div>
      <form
        className="flex gap-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          const value = text.trim();
          if (!value) return;
          setTodos((t) => [...t, { id: `${Date.now()}`, text: value.slice(0, 80), done: false }]);
          setText('');
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && (e.target as HTMLInputElement).blur()}
          placeholder="เช่น อ่านบทที่ 3"
          className="min-w-0 flex-1 rounded-lg border border-line bg-white px-2.5 py-1.5 text-sm outline-none focus:border-accent"
        />
        <button className="rounded-lg bg-accent px-3 text-sm font-bold text-white">+</button>
      </form>
      <ul className="flex max-h-56 flex-col gap-1 overflow-y-auto">
        {todos.map((t) => (
          <li key={t.id} className="group flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={t.done}
              onChange={() => setTodos((all) => all.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)))}
              className="size-4 accent-[var(--accent)]"
            />
            <span className={`min-w-0 flex-1 break-words ${t.done ? 'text-muted line-through' : ''}`}>{t.text}</span>
            <button
              onClick={() => setTodos((all) => all.filter((x) => x.id !== t.id))}
              className="text-xs text-muted opacity-0 group-hover:opacity-100 focus:opacity-100"
              aria-label="ลบ"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
      {todos.length > 0 && left === 0 && <p className="text-center text-sm font-bold">✨ เสร็จหมดแล้ว เก่งมาก!</p>}
    </div>
  );
}

/** Everyone in this room, ranked by focus minutes today. */
function RanksPanel({ room }: { room: StudyRoom }) {
  useTick(2000);
  const rows: (PlayerView & { id: string })[] = [];
  room.state.players?.forEach((p, id) => rows.push({ ...p, id, name: p.name, todayMin: p.todayMin, status: p.status }));
  rows.sort((a, b) => b.todayMin - a.todayMin);
  return (
    <div className="panel flex flex-col gap-2 p-3">
      <span className="text-xs font-extrabold tracking-wider text-muted uppercase">โฟกัสวันนี้ในห้องนี้</span>
      <ol className="flex max-h-64 flex-col gap-1 overflow-y-auto text-sm">
        {rows.map((r, i) => (
          <li key={r.id} className={`flex items-center gap-2 ${r.id === room.sessionId ? 'font-bold' : ''}`}>
            <span className="w-5 text-center">{['🥇', '🥈', '🥉'][i] ?? i + 1}</span>
            <span className="min-w-0 flex-1 truncate">
              {r.name}
              {r.id === room.sessionId && ' (คุณ)'} {STATUS_ICON[r.status] ?? ''}
            </span>
            <span className="font-mono text-xs text-muted">{formatMinutes(r.todayMin)}</span>
          </li>
        ))}
      </ol>
      <p className="text-[11px] text-muted">นับเฉพาะช่วงโฟกัสที่จบแล้ว อย่างน้อย 1 นาที</p>
    </div>
  );
}

const AMBIENT_LABEL: Record<AmbientSound, string> = { rain: '🌧️ ฝนตก', cafe: '☕ คาเฟ่', lofi: '🎵 Lo-fi' };

function AmbientPanel() {
  const engine = useRef<AmbientEngine | null>(null);
  const [levels, setLevels] = useState<Record<AmbientSound, number>>({ rain: 0, cafe: 0, lofi: 0 });
  useEffect(() => () => engine.current?.stopAll(), []);

  const set = (sound: AmbientSound, v: number) => {
    engine.current ??= new AmbientEngine();
    engine.current.setVolume(sound, v);
    setLevels((l) => ({ ...l, [sound]: v }));
  };

  return (
    <div className="panel flex flex-col gap-2.5 p-3">
      <span className="text-xs font-extrabold tracking-wider text-muted uppercase">เสียงบรรยากาศ</span>
      {AMBIENT_SOUNDS.map((s) => (
        <label key={s} className="flex items-center gap-2 text-sm">
          <button
            onClick={() => set(s, levels[s] > 0 ? 0 : 0.6)}
            className={`w-24 rounded-lg px-2 py-1 text-left text-sm font-bold ${levels[s] > 0 ? 'bg-accent text-white' : 'border border-line bg-white'}`}
          >
            {AMBIENT_LABEL[s]}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={levels[s]}
            onChange={(e) => set(s, Number(e.target.value))}
            className="min-w-0 flex-1 accent-[var(--accent)]"
            aria-label={`ระดับเสียง ${AMBIENT_LABEL[s]}`}
          />
        </label>
      ))}
      <p className="text-[11px] text-muted">สร้างเสียงสดในเบราว์เซอร์ คนอื่นไม่ได้ยิน</p>
    </div>
  );
}
