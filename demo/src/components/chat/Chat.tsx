'use client';

import { useState } from 'react';
import { ImagePlus, Send, Smile } from 'lucide-react';
import { UserAvatar } from '@/components/UserAvatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { userById, type Message } from '@/lib/mock';

/** Messages grouped by author, with mentions highlighted and soft reaction chips. */
export function MessageList({ messages, className }: { messages: Message[]; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-1 px-4 py-4', className)}>
      {messages.map((m, i) => {
        if (m.system)
          return (
            <p key={m.id} className="my-2 rounded-2xl bg-muted px-3 py-2 text-center text-sm text-muted-foreground">
              {m.text}
            </p>
          );
        const u = userById(m.author);
        const grouped = i > 0 && messages[i - 1]!.author === m.author && !messages[i - 1]!.system;
        const mentionsMe = m.text.includes('@feifei');
        return (
          <div
            key={m.id}
            className={cn(
              'group flex gap-3 rounded-2xl px-2 py-1 hover:bg-muted/50',
              !grouped && 'mt-2',
              mentionsMe && 'bg-secondary/60 hover:bg-secondary/80',
            )}
          >
            <div className="w-10 flex-none">{!grouped && <UserAvatar user={u} size={40} />}</div>
            <div className="min-w-0 flex-1">
              {!grouped && (
                <p className="flex items-baseline gap-2">
                  <span className="font-extrabold" style={{ color: u.id === 'me' ? 'var(--primary)' : undefined }}>
                    {u.name}
                  </span>
                  <span className="text-xs text-muted-foreground">{m.at}</span>
                </p>
              )}
              <p className="leading-relaxed break-words">{highlight(m.text)}</p>
              {m.image && (
                <div
                  className="mt-2 aspect-[4/3] w-64 max-w-full overflow-hidden rounded-2xl border bg-[url('/screenshot.png')] bg-[length:240%] bg-[position:35%_35%]"
                  role="img"
                  aria-label="Shared picture"
                />
              )}
              {m.reactions && (
                <div className="mt-1.5 flex gap-1">
                  {m.reactions.map((r) => (
                    <span
                      key={r.emoji}
                      className={cn(
                        'flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold',
                        r.mine ? 'border-primary bg-secondary text-secondary-foreground' : 'bg-card',
                      )}
                    >
                      {r.emoji} {r.count}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function highlight(text: string) {
  return text.split(/(@\w+)/g).map((part, i) =>
    part.startsWith('@') ? (
      <span key={i} className="rounded-md bg-primary/15 px-1 font-bold text-primary">
        {part}
      </span>
    ) : (
      part
    ),
  );
}

/** The message box: add an image, emoji, send. Calls onSend with the text; the demo just appends it. */
export function Composer({ placeholder, onSend, compact }: { placeholder: string; onSend: (text: string) => void; compact?: boolean }) {
  const [text, setText] = useState('');
  return (
    <form
      className={cn(
        'flex items-center gap-1 rounded-2xl border bg-card p-1.5 shadow-sm focus-within:border-primary',
        compact && 'rounded-xl p-1',
      )}
      onSubmit={(e) => {
        e.preventDefault();
        if (!text.trim()) return;
        onSend(text.trim());
        setText('');
      }}
    >
      {!compact && (
        <Button type="button" size="icon" variant="ghost" className="rounded-xl text-muted-foreground" aria-label="Add an image">
          <ImagePlus />
        </Button>
      )}
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        className="h-9 min-w-0 flex-1 bg-transparent px-2 text-sm outline-none"
        aria-label={placeholder}
      />
      {!compact && (
        <Button type="button" size="icon" variant="ghost" className="rounded-xl text-muted-foreground" aria-label="Emoji">
          <Smile />
        </Button>
      )}
      <Button type="submit" size="icon" className="rounded-xl" aria-label="Send">
        <Send />
      </Button>
    </form>
  );
}
