'use client';

import { useEffect, useState } from 'react';

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

/** Private checklist kept in this browser only. The room page is client-only, so localStorage is safe to read up front. */
export function TodoPanel() {
  const [todos, setTodos] = useState<Todo[]>(loadTodos);
  const [text, setText] = useState('');
  useEffect(() => {
    try {
      localStorage.setItem(TODO_KEY, JSON.stringify(todos));
    } catch {}
  }, [todos]);

  const left = todos.filter((t) => !t.done).length;
  return (
    <div className="panel flex flex-col gap-3 p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-extrabold">To-do</h2>
        <span className="text-xs text-muted">{todos.length ? `${left} of ${todos.length} left` : 'Only you can see this'}</span>
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
          placeholder="e.g. Read chapter 3"
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
              aria-label="Delete"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
      {todos.length > 0 && left === 0 && <p className="text-center text-sm font-bold">✨ All done, great work!</p>}
    </div>
  );
}
