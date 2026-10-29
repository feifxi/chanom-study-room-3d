'use client';

import { useEffect, useRef, useState } from 'react';
import { CHAT_MAX, type ChatMessage } from '@study/shared';
import type { StudyRoom } from '../room/roomSession';

/** Re-send typing this often while keys keep coming; the server clears it after a few quiet seconds. */
const TYPING_HEARTBEAT_MS = 2500;

interface Props {
  room: StudyRoom;
  messages: ChatMessage[];
  /** Toggled from the dock; stays mounted while closed so a draft survives. */
  open: boolean;
  onOpen: () => void;
}

/** Room chat: a short log plus the input. Enter opens and focuses it from anywhere; typing shows dots over your head. */
export function ChatPanel({ room, messages, open, onOpen }: Props) {
  const [text, setText] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const typingSent = useRef({ on: false, at: 0 });

  // Tell the room we're typing: on change of state, and as a heartbeat while keys keep coming.
  const signalTyping = (on: boolean) => {
    const now = Date.now();
    const last = typingSent.current;
    if (on === last.on && (!on || now - last.at < TYPING_HEARTBEAT_MS)) return;
    room.send('typing', { on });
    typingSent.current = { on, at: now };
  };
  const list = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        onOpen();
        // The panel may have been hidden: focus once it's visible
        requestAnimationFrame(() => input.current?.focus());
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onOpen]);

  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight });
  }, [messages.length]);

  return (
    <section
      aria-label="Chat"
      className={`panel absolute bottom-4 left-4 w-[min(340px,calc(100%-32px))] flex-col gap-2 p-3 ${open ? 'flex' : 'hidden'}`}
    >
      <ol ref={list} className="flex max-h-40 flex-col gap-1 overflow-y-auto text-sm">
        {messages.length === 0 && <li className="text-xs text-muted">Say hi to the room 👋</li>}
        {messages.map((m) =>
          m.system ? (
            <li key={m.id} className="rounded-lg bg-soft px-2 py-1 text-xs leading-snug text-muted">
              {m.text}
            </li>
          ) : (
            <li key={m.id} className="leading-snug">
              <b className={m.sessionId === room.sessionId ? 'text-accent-ink' : ''}>{m.name}</b>{' '}
              <span className="break-words">{m.text}</span>
            </li>
          ),
        )}
      </ol>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const value = text.trim();
          if (value) room.send('chat', { text: value });
          else signalTyping(false);
          typingSent.current = { on: false, at: 0 }; // the server clears typing when a message arrives
          setText('');
          input.current?.blur();
        }}
      >
        <input
          ref={input}
          value={text}
          maxLength={CHAT_MAX}
          onChange={(e) => {
            setText(e.target.value);
            signalTyping(e.target.value.trim().length > 0);
          }}
          onBlur={() => signalTyping(false)}
          onKeyDown={(e) => e.key === 'Escape' && input.current?.blur()}
          placeholder="Type a message… (Enter)"
          className="min-w-0 flex-1 rounded-lg border border-line bg-white px-3 py-1.5 text-sm outline-none focus:border-accent"
        />
        <button className="rounded-xl bg-accent px-3 py-1.5 text-sm font-bold text-white">Send</button>
      </form>
    </section>
  );
}
