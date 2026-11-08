'use client';

import { useRef, useState, type ReactNode } from 'react';
import { ArrowDown, CornerUpLeft, ImagePlus, Pencil, Send, Smile, SmilePlus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { UserAvatar } from '@/components/UserAvatar';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { BLOCKED, ME, userById, type Message } from '@/lib/mock';

/** Quick reactions on hover; the smiley opens the rest. */
const QUICK = ['❤️', '😂', '👍'];
const EMOJI = ['❤️', '😂', '👍', '🥹', '🔥', '🎉', '👀', '🙏', '💖', '🍪', '🐱', '✨', '😴', '📚', '☕', '🍓'];
export const MAX_IMAGES = 4;
export const MAX_IMAGE_MB = 10;

type ThreadProps = {
  /** Messages so far (mock). The thread keeps its own copy: sends, edits, deletes, reactions. */
  initial: Message[];
  placeholder: string;
  /** Who the @ picker offers (ids). */
  members: string[];
  /** Owner and mods: delete anyone's message, use @room. */
  moderator?: boolean;
  /** How many of the last messages are unread: a "New messages" line goes above them. */
  unread?: number;
  /** Shown above the first message (e.g. "This is the start of your messages with Mai"). */
  intro?: ReactNode;
  /** Replaces the message box (unfriended, blocked). */
  locked?: ReactNode;
  /** Demo: after you send, this person "types" and answers, to show the typing line. */
  replier?: { id: string; text: string };
  className?: string;
};

/**
 * A chat: room chat or a DM, the same everywhere (the Chat page, the big chat window in 3D, Messages).
 * - hover a message: quick reactions, reply, edit (yours, shows "edited"), delete (yours; owner and
 *   mods: anyone's). No threads.
 * - "New messages" line where you left off, and "Jump to latest" when you've scrolled up
 * - @ opens a member picker; @room pings everyone (owner and mods only)
 * - up to 4 pictures a message, 10 MB each (compressed on upload in the real app)
 * - "… is typing"; no read receipts ("Seen"), on purpose: no pressure to answer
 * - people you've blocked: their messages fold into "Blocked message · show"
 */
export function ChatThread({ initial, placeholder, members, moderator, unread = 0, intro, locked, replier, className }: ThreadProps) {
  const [messages, setMessages] = useState(initial);
  const [divider, setDivider] = useState(unread > 0 ? (initial[initial.length - unread]?.id ?? null) : null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [typing, setTyping] = useState<string | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  const scroller = useRef<HTMLDivElement>(null);

  const toBottom = () =>
    requestAnimationFrame(() => scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' }));
  const update = (id: string, change: (m: Message) => Message) => setMessages((all) => all.map((m) => (m.id === id ? change(m) : m)));

  const send = (text: string, images: string[]) => {
    const m: Message = {
      id: `${Date.now()}`,
      author: 'me',
      at: 'Now',
      text,
      images: images.length ? images : undefined,
      replyTo: replyTo?.id,
    };
    setMessages((all) => [...all, m]);
    setReplyTo(null);
    setDivider(null);
    toBottom();
    if (replier) {
      setTimeout(() => setTyping(replier.id), 700);
      setTimeout(() => {
        setTyping(null);
        setMessages((all) => [...all, { id: `${Date.now()}r`, author: replier.id, at: 'Now', text: replier.text }]);
        toBottom();
      }, 2600);
    }
  };

  const remove = (m: Message) => {
    const index = messages.findIndex((x) => x.id === m.id);
    setMessages((all) => all.filter((x) => x.id !== m.id));
    toast(m.author === 'me' ? 'Message deleted' : `Deleted ${userById(m.author).name}’s message`, {
      action: { label: 'Undo', onClick: () => setMessages((all) => [...all.slice(0, index), m, ...all.slice(index)]) },
    });
  };

  const react = (m: Message, emoji: string) =>
    update(m.id, (x) => {
      const list = x.reactions ?? [];
      const found = list.find((r) => r.emoji === emoji);
      const next = found
        ? list.map((r) => (r.emoji === emoji ? { ...r, mine: !r.mine, count: r.count + (r.mine ? -1 : 1) } : r)).filter((r) => r.count > 0)
        : [...list, { emoji, count: 1, mine: true }];
      return { ...x, reactions: next };
    });

  return (
    <div className={cn('relative flex min-h-0 flex-1 flex-col', className)}>
      <div
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget;
          setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 80);
        }}
        className="min-h-0 flex-1 overflow-y-auto"
      >
        {intro}
        <div className="flex flex-col gap-0.5 px-3 py-4">
          {messages.map((m, i) => {
            const prev = messages[i - 1];
            return (
              <div key={m.id}>
                {divider === m.id && (
                  <p className="my-2 flex items-center gap-2 text-[11px] font-black tracking-wider text-primary uppercase">
                    <span className="h-px flex-1 bg-primary/40" /> New messages <span className="h-px flex-1 bg-primary/40" />
                  </p>
                )}
                <Row
                  m={m}
                  grouped={!!prev && prev.author === m.author && !prev.system && !m.replyTo && divider !== m.id}
                  quoted={m.replyTo ? messages.find((x) => x.id === m.replyTo) : undefined}
                  editing={editing === m.id}
                  canDelete={m.author === 'me' || !!moderator}
                  onReact={(e) => react(m, e)}
                  onReply={() => setReplyTo(m)}
                  onEdit={() => setEditing(m.id)}
                  onSave={(text) => {
                    if (text && text !== m.text) update(m.id, (x) => ({ ...x, text, edited: true }));
                    setEditing(null);
                  }}
                  onDelete={() => remove(m)}
                />
              </div>
            );
          })}
        </div>
      </div>

      {!atBottom && (
        <button
          onClick={() => {
            toBottom();
            setDivider(null);
          }}
          className="absolute bottom-24 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-extrabold text-primary-foreground shadow-soft"
        >
          <ArrowDown className="size-3.5" /> Jump to latest
        </button>
      )}

      <p className={cn('h-5 px-5 text-xs text-muted-foreground', !typing && 'invisible')} aria-live="polite">
        {typing && (
          <>
            <span className="font-bold">{userById(typing).name}</span> is typing
            <span className="ml-0.5 inline-flex gap-0.5 align-middle">
              {[0, 1, 2].map((d) => (
                <span
                  key={d}
                  className="size-1 animate-bounce rounded-full bg-muted-foreground"
                  style={{ animationDelay: `${d * 120}ms` }}
                />
              ))}
            </span>
          </>
        )}
      </p>
      <div className="px-3 pb-3">
        {locked ?? (
          <FullComposer
            placeholder={placeholder}
            members={members}
            canPingRoom={!!moderator}
            replyTo={replyTo}
            onCancelReply={() => setReplyTo(null)}
            onSend={send}
          />
        )}
      </div>
    </div>
  );
}

function Row({
  m,
  grouped,
  quoted,
  editing,
  canDelete,
  onReact,
  onReply,
  onEdit,
  onSave,
  onDelete,
}: {
  m: Message;
  grouped: boolean;
  quoted?: Message;
  editing: boolean;
  canDelete: boolean;
  onReact: (emoji: string) => void;
  onReply: () => void;
  onEdit: () => void;
  onSave: (text: string) => void;
  onDelete: () => void;
}) {
  const [shown, setShown] = useState(false);
  if (m.system) return <p className="my-2 rounded-2xl bg-muted px-3 py-2 text-center text-sm text-muted-foreground">{m.text}</p>;
  const u = userById(m.author);
  if (BLOCKED.has(m.author) && !shown)
    return (
      <button onClick={() => setShown(true)} className="my-1 ml-12 w-fit text-xs font-semibold text-muted-foreground hover:underline">
        Blocked message · show
      </button>
    );
  const mentionsMe = m.author !== 'me' && (m.text.includes(`@${ME.handle}`) || m.text.includes('@room'));

  return (
    <div
      className={cn(
        'group relative flex gap-3 rounded-2xl px-2 py-1 hover:bg-muted/50',
        !grouped && 'mt-2',
        mentionsMe && 'bg-secondary/60 hover:bg-secondary/80',
      )}
    >
      <div className="w-9 flex-none">{!grouped && <UserAvatar user={u} size={36} />}</div>
      <div className="min-w-0 flex-1">
        {quoted && (
          <p className="mb-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
            <CornerUpLeft className="size-3 flex-none" />
            <span className="font-bold">{userById(quoted.author).name}</span>
            <span className="truncate">{quoted.text || 'a picture'}</span>
          </p>
        )}
        {!grouped && (
          <p className="flex items-baseline gap-2">
            <span className="font-extrabold" style={{ color: u.id === 'me' ? 'var(--primary)' : undefined }}>
              {u.name}
            </span>
            <span className="text-xs text-muted-foreground">{m.at}</span>
          </p>
        )}
        {editing ? (
          <EditBox text={m.text} onSave={onSave} />
        ) : (
          m.text && (
            <p className="leading-relaxed break-words">
              {highlight(m.text)}
              {m.edited && <span className="ml-1 text-[11px] text-muted-foreground">(edited)</span>}
            </p>
          )
        )}
        {m.image && (
          <div
            className="mt-2 aspect-[4/3] w-64 max-w-full overflow-hidden rounded-2xl border bg-[url('/screenshot.png')] bg-[length:240%] bg-[position:35%_35%]"
            role="img"
            aria-label="Shared picture"
          />
        )}
        {m.images && (
          <div className={cn('mt-2 grid max-w-sm gap-1.5', m.images.length > 1 && 'grid-cols-2')}>
            {m.images.map((src) => (
              // eslint-disable-next-line @next/next/no-img-element -- local object URLs in the demo
              <img key={src} src={src} alt="Shared picture" className="aspect-[4/3] w-full rounded-2xl border object-cover" />
            ))}
          </div>
        )}
        {!!m.reactions?.length && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {m.reactions.map((r) => (
              <button
                key={r.emoji}
                onClick={() => onReact(r.emoji)}
                className={cn(
                  'flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold',
                  r.mine ? 'border-primary bg-secondary text-secondary-foreground' : 'bg-card hover:border-primary/50',
                )}
              >
                {r.emoji} {r.count}
              </button>
            ))}
          </div>
        )}
      </div>

      {!editing && (
        <div className="absolute -top-3 right-2 hidden items-center gap-0.5 rounded-full border bg-card p-0.5 shadow-sm group-hover:flex has-[[data-state=open]]:flex">
          {QUICK.map((e) => (
            <button
              key={e}
              onClick={() => onReact(e)}
              className="grid size-7 place-items-center rounded-full hover:bg-muted"
              aria-label={`React ${e}`}
            >
              {e}
            </button>
          ))}
          <EmojiPicker onPick={onReact}>
            <button
              className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-muted"
              aria-label="More reactions"
            >
              <SmilePlus className="size-4" />
            </button>
          </EmojiPicker>
          <ToolButton label="Reply" onClick={onReply}>
            <CornerUpLeft className="size-4" />
          </ToolButton>
          {m.author === 'me' && (
            <ToolButton label="Edit" onClick={onEdit}>
              <Pencil className="size-4" />
            </ToolButton>
          )}
          {canDelete && (
            <ToolButton label="Delete" onClick={onDelete} danger>
              <Trash2 className="size-4" />
            </ToolButton>
          )}
        </div>
      )}
    </div>
  );
}

function ToolButton({ label, onClick, danger, children }: { label: string; onClick: () => void; danger?: boolean; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        'grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-muted',
        danger && 'hover:bg-destructive/10 hover:text-destructive',
      )}
    >
      {children}
    </button>
  );
}

function EditBox({ text, onSave }: { text: string; onSave: (text: string) => void }) {
  const [value, setValue] = useState(text);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(value.trim());
      }}
      className="mt-0.5 flex flex-col gap-1"
    >
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && onSave(text)}
        className="h-9 rounded-xl border bg-card px-3 text-sm outline-none focus:border-primary"
        aria-label="Edit message"
      />
      <span className="text-[11px] text-muted-foreground">Enter to save · Esc to cancel</span>
    </form>
  );
}

function EmojiPicker({ onPick, children }: { onPick: (emoji: string) => void; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="end" className="grid w-auto grid-cols-8 gap-0.5 rounded-2xl p-1.5">
        {EMOJI.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => {
              onPick(e);
              setOpen(false);
            }}
            className="grid size-8 place-items-center rounded-lg text-lg hover:bg-muted"
          >
            {e}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function highlight(text: string) {
  return text.split(/(@[\w.]*\w)/g).map((part, i) =>
    part.startsWith('@') ? (
      <span key={i} className="rounded-md bg-primary/15 px-1 font-bold text-primary">
        {part}
      </span>
    ) : (
      part
    ),
  );
}

/**
 * The full message box: pictures (up to 4, 10 MB each), emoji, an @ picker of the room's members
 * (plus @room for owner and mods), and the "Replying to" strip.
 */
function FullComposer({
  placeholder,
  members,
  canPingRoom,
  replyTo,
  onCancelReply,
  onSend,
}: {
  placeholder: string;
  members: string[];
  canPingRoom: boolean;
  replyTo: Message | null;
  onCancelReply: () => void;
  onSend: (text: string, images: string[]) => void;
}) {
  const [text, setText] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [pick, setPick] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const files = useRef<HTMLInputElement>(null);

  // "@ma" at the end of the text opens the picker
  const query = /(?:^|\s)@([\w.]*)$/.exec(text)?.[1];
  const options =
    query === undefined
      ? []
      : [
          ...(canPingRoom ? [{ id: 'room', name: 'room', hint: 'Everyone in this room' }] : []),
          ...members
            .filter((id) => id !== 'me')
            .map((id) => userById(id))
            .map((u) => ({ id: u.id, name: u.handle, hint: u.name })),
        ]
          .filter((o) => o.name.startsWith(query.toLowerCase()) || o.hint.toLowerCase().startsWith(query.toLowerCase()))
          .slice(0, 6);
  const choose = (name: string) => {
    setText((t) => t.replace(/@[\w.]*$/, `@${name} `));
    setPick(0);
    input.current?.focus();
  };

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const ok = [...list].filter((f) => f.type.startsWith('image/') && f.size <= MAX_IMAGE_MB * 1024 * 1024);
    if (ok.length < list.length) toast(`Pictures only, up to ${MAX_IMAGE_MB} MB each`);
    const room = MAX_IMAGES - images.length;
    if (ok.length > room) toast(`Up to ${MAX_IMAGES} pictures a message`);
    setImages((all) => [...all, ...ok.slice(0, room).map((f) => URL.createObjectURL(f))]);
  };

  return (
    <div className="relative">
      {options.length > 0 && (
        <div
          className="absolute bottom-full left-0 mb-2 w-64 rounded-2xl border bg-card p-1 shadow-soft"
          role="listbox"
          aria-label="Mention someone"
        >
          {options.map((o, i) => (
            <button
              key={o.id}
              type="button"
              role="option"
              aria-selected={i === pick}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(o.name);
              }}
              className={cn('flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-sm', i === pick && 'bg-muted')}
            >
              {o.id === 'room' ? (
                <span className="grid size-6 place-items-center rounded-full bg-primary text-xs font-black text-primary-foreground">@</span>
              ) : (
                <UserAvatar user={userById(o.id)} size={24} />
              )}
              <span className="font-bold">@{o.name}</span>
              <span className="truncate text-xs text-muted-foreground">{o.hint}</span>
            </button>
          ))}
        </div>
      )}

      <div className="rounded-2xl border bg-card shadow-sm focus-within:border-primary">
        {replyTo && (
          <p className="flex items-center gap-1.5 border-b px-3 py-1.5 text-xs text-muted-foreground">
            <CornerUpLeft className="size-3.5" /> Replying to{' '}
            <span className="font-bold text-foreground">{userById(replyTo.author).name}</span>
            <button onClick={onCancelReply} className="ml-auto rounded-full p-0.5 hover:bg-muted" aria-label="Cancel reply">
              <X className="size-3.5" />
            </button>
          </p>
        )}
        {images.length > 0 && (
          <div className="flex gap-2 border-b p-2">
            {images.map((src) => (
              <span key={src} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element -- local object URLs in the demo */}
                <img src={src} alt="" className="size-16 rounded-xl object-cover" />
                <button
                  onClick={() => setImages((all) => all.filter((x) => x !== src))}
                  className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-foreground text-background"
                  aria-label="Remove picture"
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
            <span className="self-end text-[11px] text-muted-foreground">
              {images.length}/{MAX_IMAGES}
            </span>
          </div>
        )}
        <form
          className="flex items-center gap-1 p-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            if (options.length) return choose(options[pick]!.name);
            if (!text.trim() && !images.length) return;
            onSend(text.trim(), images);
            setText('');
            setImages([]);
          }}
        >
          <input
            ref={files}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = '';
            }}
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="rounded-xl text-muted-foreground"
            aria-label="Add pictures"
            disabled={images.length >= MAX_IMAGES}
            onClick={() => files.current?.click()}
          >
            <ImagePlus />
          </Button>
          <input
            ref={input}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setPick(0);
            }}
            onKeyDown={(e) => {
              if (!options.length) {
                if (e.key === 'Escape' && replyTo) onCancelReply();
                return;
              }
              const step = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
              if (step) {
                e.preventDefault();
                setPick((p) => (p + step + options.length) % options.length);
              } else if (e.key === 'Tab') {
                e.preventDefault();
                choose(options[pick]!.name);
              }
            }}
            placeholder={placeholder}
            className="h-9 min-w-0 flex-1 bg-transparent px-2 text-sm outline-none"
            aria-label={placeholder}
          />
          <EmojiPicker onPick={(e) => setText((t) => t + e)}>
            <Button type="button" size="icon" variant="ghost" className="rounded-xl text-muted-foreground" aria-label="Emoji">
              <Smile />
            </Button>
          </EmojiPicker>
          <Button type="submit" size="icon" className="rounded-xl" aria-label="Send">
            <Send />
          </Button>
        </form>
      </div>
    </div>
  );
}

/** The small message box (the in-room chat panel): text and send only. */
export function Composer({
  placeholder,
  onSend,
  compact,
  maxLength,
  onTyping,
}: {
  placeholder: string;
  onSend: (text: string) => void;
  compact?: boolean;
  maxLength?: number;
  onTyping?: (typing: boolean) => void;
}) {
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
        onTyping?.(false);
      }}
    >
      <input
        value={text}
        maxLength={maxLength}
        onChange={(e) => {
          setText(e.target.value);
          onTyping?.(e.target.value.length > 0);
        }}
        onBlur={() => onTyping?.(false)}
        placeholder={placeholder}
        className="h-9 min-w-0 flex-1 bg-transparent px-2 text-sm outline-none"
        aria-label={placeholder}
      />
      <Button type="submit" size="icon" className="rounded-xl" aria-label="Send">
        <Send />
      </Button>
    </form>
  );
}

/**
 * In place of the message box when a DM can't continue: no longer friends (history stays, read-only,
 * "Add friend" to start again) or blocked (they can't message you; unblock to talk again).
 */
export function DmLocked({ name, state, onAction }: { name: string; state: 'unfriended' | 'blocked'; onAction: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-muted px-4 py-3 text-sm">
      <span className="flex-1 text-muted-foreground">
        {state === 'unfriended'
          ? `You and ${name} aren’t friends any more, so this chat is read-only.`
          : `You blocked ${name}. They can’t message you.`}
      </span>
      <Button size="sm" variant={state === 'unfriended' ? 'default' : 'outline'} className="rounded-full font-bold" onClick={onAction}>
        {state === 'unfriended' ? 'Add friend' : 'Unblock'}
      </Button>
    </div>
  );
}
