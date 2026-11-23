'use client';

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowDown, CornerUpLeft, ImagePlus, Pencil, Send, Smile, SmilePlus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useMe } from '@/features/account/useMe';
import { planOf, PICTURES_MAX } from '@connecta/shared';
import { UserAvatar } from '@/components/UserAvatar';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { BLOCKED, ME, userById, type Message } from '@/lib/mock';

/** Quick reactions on hover; the smiley opens the rest. */
const QUICK = ['❤️', '😂', '👍'];
const EMOJI = ['❤️', '😂', '👍', '🥹', '🔥', '🎉', '👀', '🙏', '💖', '🍪', '🐱', '✨', '😴', '📚', '☕', '🍓'];
export const MAX_IMAGES = PICTURES_MAX;
/** Free's limit; yours is ROOM_PLANS' uploadMb (50 MB with Plus) */
export const MAX_IMAGE_MB = planOf(false).uploadMb;

/** A message ready to show: the author and the quoted reply already looked up. */
export interface ChatMessageView {
  id: string;
  author: { id: string; name: string; color: string };
  /** You wrote it: name in your colour, Edit in the toolbar */
  mine: boolean;
  /** "20:41", "Yesterday 20:41"… */
  at: string;
  text: string;
  /** The demo's placeholder picture (mock messages) */
  image?: boolean;
  /** Picture URLs; null while one is still being got ready (only its sender sees that) */
  images?: (string | null)[];
  reactions: { emoji: string; count: number; mine: boolean }[];
  /** The message it answers, quoted above it */
  quote?: { name: string; text: string };
  edited?: boolean;
  system?: boolean;
  gift?: { months: number; note?: string };
  /** A DM card (Ask to join, an invite to a room), drawn by whoever owns the messages; can't be edited */
  card?: ReactNode;
  /** It @mentions you or @room: tinted */
  mentionsMe?: boolean;
  /** From someone you blocked: folded until you tap "show" */
  blocked?: boolean;
  /** Still sending */
  pending?: boolean;
}

/** Someone the @ picker offers. */
export interface Mentionable {
  id: string;
  handle: string;
  name: string;
  color: string;
}

type ViewProps = {
  messages: ChatMessageView[];
  placeholder: string;
  /** Who the @ picker offers (not you) */
  mentionables: Mentionable[];
  /** Owner and mods: delete anyone's message, use @room */
  moderator?: boolean;
  /** "New messages" goes above this message */
  dividerAt?: string | null;
  /** Who's typing, if anyone */
  typing?: string | null;
  /** Shown above the first message (e.g. "This is the start of your messages with Mai") */
  intro?: ReactNode;
  /** Replaces the message box (unfriended, blocked) */
  locked?: ReactNode;
  /** The picture button (pictures in saved chats come with uploads) */
  pictures?: boolean;
  /** Older messages to load at the top */
  hasMore?: boolean;
  onLoadMore?: () => void;
  onSend: (text: string, images: string[], replyTo: ChatMessageView | null) => void;
  onEdit: (m: ChatMessageView, text: string) => void;
  onDelete: (m: ChatMessageView) => void;
  onReact: (m: ChatMessageView, emoji: string) => void;
  /** You've scrolled to the latest message (to mark the chat read) */
  onSeeLatest?: () => void;
  /** You're typing (sent every few seconds while you type) */
  onTyping?: () => void;
  className?: string;
};

/**
 * A chat: room chat or a DM, the same everywhere (the Chat page, the big chat window in 3D, Messages).
 * - hover a message: quick reactions, reply, edit (yours, shows "edited"), delete (yours; owner and
 *   mods: anyone's). No threads.
 * - "New messages" line where you left off, and "Jump to latest" when you've scrolled up
 * - @ opens a member picker; @room pings everyone (owner and mods only)
 * - up to 4 pictures a message, 10 MB each (compressed on upload)
 * - "… is typing"; no read receipts ("Seen"), on purpose: no pressure to answer
 * - people you've blocked: their messages fold into "Blocked message · show"
 * It only shows; whoever renders it owns the messages (the API, or the demo's mock state).
 */
export function ChatView({
  messages,
  placeholder,
  mentionables,
  moderator,
  dividerAt = null,
  typing,
  intro,
  locked,
  pictures = true,
  hasMore,
  onLoadMore,
  onSend,
  onEdit,
  onDelete,
  onReact,
  onSeeLatest,
  onTyping,
  className,
}: ViewProps) {
  const [divider, setDivider] = useState(dividerAt);
  const [replyTo, setReplyTo] = useState<ChatMessageView | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  const scroller = useRef<HTMLDivElement>(null);
  const last = messages[messages.length - 1]?.id;
  const first = messages[0]?.id;
  const height = useRef(0);

  const toBottom = (smooth = true) =>
    requestAnimationFrame(() =>
      scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: smooth ? 'smooth' : 'instant' }),
    );

  // Opening a chat starts at the latest message; a new one keeps you there if you were already
  useLayoutEffect(() => {
    if (atBottom) toBottom(false);
    // Only when the newest message changes; scrolling up must not snap back
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [last]);

  // Older messages loaded at the top: keep what you were reading in place
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    if (height.current && el.scrollTop < 40) el.scrollTop += el.scrollHeight - height.current;
    height.current = el.scrollHeight;
  }, [first]);

  useEffect(() => {
    if (atBottom && last) onSeeLatest?.();
  }, [atBottom, last, onSeeLatest]);

  return (
    <div className={cn('relative flex min-h-0 flex-1 flex-col', className)}>
      <div
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget;
          setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 80);
          height.current = el.scrollHeight;
        }}
        className="min-h-0 flex-1 overflow-y-auto"
      >
        {hasMore ? (
          <div className="flex justify-center pt-3">
            <Button size="sm" variant="secondary" className="rounded-full font-bold" onClick={onLoadMore}>
              Earlier messages
            </Button>
          </div>
        ) : (
          intro
        )}
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
                  grouped={!!prev && prev.author.id === m.author.id && !prev.system && !m.quote && divider !== m.id}
                  editing={editing === m.id}
                  canDelete={m.mine || !!moderator}
                  onReact={(e) => onReact(m, e)}
                  onReply={() => setReplyTo(m)}
                  onEdit={() => setEditing(m.id)}
                  onSave={(text) => {
                    if (text && text !== m.text) onEdit(m, text);
                    setEditing(null);
                  }}
                  onDelete={() => onDelete(m)}
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
            <span className="font-bold">{typing}</span> is typing
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
            mentionables={mentionables}
            canPingRoom={!!moderator}
            pictures={pictures}
            replyTo={replyTo}
            onCancelReply={() => setReplyTo(null)}
            onTyping={onTyping}
            onSend={(text, images) => {
              onSend(text, images, replyTo);
              setReplyTo(null);
              setDivider(null);
              toBottom();
            }}
          />
        )}
      </div>
    </div>
  );
}

type ThreadProps = {
  /** Messages so far (mock). The thread keeps its own copy: sends, edits, deletes, reactions. */
  initial: Message[];
  placeholder: string;
  /** Who the @ picker offers (ids). */
  members: string[];
  moderator?: boolean;
  /** How many of the last messages are unread: a "New messages" line goes above them. */
  unread?: number;
  intro?: ReactNode;
  locked?: ReactNode;
  /** Demo: after you send, this person "types" and answers, to show the typing line. */
  replier?: { id: string; text: string };
  className?: string;
};

/** The demo's chat on mock data (DMs until they move to the API): its own copy of the messages. */
export function ChatThread({ initial, placeholder, members, moderator, unread = 0, intro, locked, replier, className }: ThreadProps) {
  const [messages, setMessages] = useState(initial);
  const [typing, setTyping] = useState<string | null>(null);
  const update = (id: string, change: (m: Message) => Message) => setMessages((all) => all.map((m) => (m.id === id ? change(m) : m)));

  const view = (m: Message): ChatMessageView => {
    const u = userById(m.author);
    const quoted = m.replyTo ? messages.find((x) => x.id === m.replyTo) : undefined;
    return {
      id: m.id,
      author: { id: u.id, name: u.name, color: u.color },
      mine: m.author === 'me',
      at: m.at,
      text: m.text,
      image: m.image,
      images: m.images,
      reactions: (m.reactions ?? []).map((r) => ({ ...r, mine: !!r.mine })),
      quote: quoted && { name: userById(quoted.author).name, text: quoted.text || 'a picture' },
      edited: m.edited,
      system: m.system,
      gift: m.gift,
      mentionsMe: m.author !== 'me' && (m.text.includes(`@${ME.handle}`) || m.text.includes('@room')),
      blocked: BLOCKED.has(m.author),
    };
  };

  return (
    <ChatView
      className={className}
      messages={messages.map(view)}
      placeholder={placeholder}
      mentionables={members
        .filter((id) => id !== 'me')
        .map((id) => userById(id))
        .map((u) => ({ id: u.id, handle: u.handle, name: u.name, color: u.color }))}
      moderator={moderator}
      dividerAt={unread > 0 ? (initial[initial.length - unread]?.id ?? null) : null}
      typing={typing && userById(typing).name}
      intro={intro}
      locked={locked}
      onSend={(text, images, replyTo) => {
        setMessages((all) => [
          ...all,
          { id: `${Date.now()}`, author: 'me', at: 'Now', text, images: images.length ? images : undefined, replyTo: replyTo?.id },
        ]);
        if (replier) {
          setTimeout(() => setTyping(replier.id), 700);
          setTimeout(() => {
            setTyping(null);
            setMessages((all) => [...all, { id: `${Date.now()}r`, author: replier.id, at: 'Now', text: replier.text }]);
          }, 2600);
        }
      }}
      onEdit={(m, text) => update(m.id, (x) => ({ ...x, text, edited: true }))}
      onDelete={(m) => {
        const index = messages.findIndex((x) => x.id === m.id);
        const original = messages[index]!;
        setMessages((all) => all.filter((x) => x.id !== m.id));
        toast(m.mine ? 'Message deleted' : `Deleted ${m.author.name}’s message`, {
          action: { label: 'Undo', onClick: () => setMessages((all) => [...all.slice(0, index), original, ...all.slice(index)]) },
        });
      }}
      onReact={(m, emoji) =>
        update(m.id, (x) => {
          const list = x.reactions ?? [];
          const found = list.find((r) => r.emoji === emoji);
          const next = found
            ? list
                .map((r) => (r.emoji === emoji ? { ...r, mine: !r.mine, count: r.count + (r.mine ? -1 : 1) } : r))
                .filter((r) => r.count > 0)
            : [...list, { emoji, count: 1, mine: true }];
          return { ...x, reactions: next };
        })
      }
    />
  );
}

function Row({
  m,
  grouped,
  editing,
  canDelete,
  onReact,
  onReply,
  onEdit,
  onSave,
  onDelete,
}: {
  m: ChatMessageView;
  grouped: boolean;
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
  const u = { ...m.author, presence: 'offline' as const };
  if (m.blocked && !shown)
    return (
      <button onClick={() => setShown(true)} className="my-1 ml-12 w-fit text-xs font-semibold text-muted-foreground hover:underline">
        Blocked message · show
      </button>
    );

  return (
    <div
      className={cn(
        'group relative flex gap-3 rounded-2xl px-2 py-1 hover:bg-muted/50',
        !grouped && 'mt-2',
        m.mentionsMe && 'bg-secondary/60 hover:bg-secondary/80',
        m.pending && 'opacity-60',
      )}
    >
      <div className="w-9 flex-none">{!grouped && <UserAvatar user={u} size={36} />}</div>
      <div className="min-w-0 flex-1">
        {m.quote && (
          <p className="mb-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
            <CornerUpLeft className="size-3 flex-none" />
            <span className="font-bold">{m.quote.name}</span>
            <span className="truncate">{m.quote.text}</span>
          </p>
        )}
        {!grouped && (
          <p className="flex items-baseline gap-2">
            <span className="font-extrabold" style={{ color: m.mine ? 'var(--primary)' : undefined }}>
              {u.name}
            </span>
            <span className="text-xs text-muted-foreground">{m.at}</span>
          </p>
        )}
        {editing ? (
          <EditBox text={m.text} onSave={onSave} />
        ) : (
          m.text && (
            <p className="leading-relaxed break-words whitespace-pre-wrap">
              {highlight(m.text)}
              {m.edited && <span className="ml-1 text-[11px] text-muted-foreground">(edited)</span>}
            </p>
          )
        )}
        {m.gift && <GiftCard from={m.mine ? 'You' : u.name} gift={m.gift} />}
        {m.card}
        {m.image && (
          <div
            className="mt-2 aspect-[4/3] w-64 max-w-full overflow-hidden rounded-2xl border bg-[url('/screenshot.png')] bg-[length:240%] bg-[position:35%_35%]"
            role="img"
            aria-label="Shared picture"
          />
        )}
        {m.images && (
          <div className={cn('mt-2 grid max-w-sm gap-1.5', m.images.length > 1 && 'grid-cols-2')}>
            {m.images.map((src, i) =>
              src ? (
                // eslint-disable-next-line @next/next/no-img-element -- object URLs and stored pictures, already sized
                <img key={src} src={src} alt="Shared picture" className="aspect-[4/3] w-full rounded-2xl border object-cover" />
              ) : (
                <div
                  key={i}
                  className="grid aspect-[4/3] w-full animate-pulse place-items-center rounded-2xl border bg-muted text-xs font-bold text-muted-foreground"
                >
                  Getting it ready…
                </div>
              ),
            )}
          </div>
        )}
        {m.reactions.length > 0 && (
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

      {!editing && !m.pending && (
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
          {m.mine && !m.card && (
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

function EmojiPicker({
  onPick,
  align = 'end',
  children,
}: {
  onPick: (emoji: string) => void;
  align?: 'start' | 'end';
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align={align} className="grid w-auto grid-cols-8 gap-0.5 rounded-2xl p-1.5">
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

/** The file behind each picked picture's preview, so a real chat can upload it when you send. */
const PICKED = new Map<string, File>();
export const pickedFile = (previewUrl: string) => PICKED.get(previewUrl);

/** Your upload limit: 10 MB, 50 MB with Plus */
function useUploadMb() {
  const { data: me } = useMe();
  return planOf(!!me?.plus).uploadMb;
}

/** Pictures picked or pasted into a message box: images only, size and count capped (with a toast). */
function takeImages(list: FileList | File[] | null, have: number, maxMb = MAX_IMAGE_MB): string[] {
  if (!list?.length) return [];
  const ok = [...list].filter((f) => f.type.startsWith('image/') && f.size <= maxMb * 1024 * 1024);
  if (ok.length < list.length) toast(`Pictures only, up to ${maxMb} MB each`);
  const room = MAX_IMAGES - have;
  if (ok.length > room) toast(`Up to ${MAX_IMAGES} pictures a message`);
  return ok.slice(0, Math.max(0, room)).map((f) => {
    const url = URL.createObjectURL(f);
    PICKED.set(url, f);
    return url;
  });
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
  mentionables,
  canPingRoom,
  pictures,
  replyTo,
  onCancelReply,
  onTyping,
  onSend,
}: {
  placeholder: string;
  mentionables: Mentionable[];
  canPingRoom: boolean;
  pictures: boolean;
  replyTo: ChatMessageView | null;
  onCancelReply: () => void;
  onTyping?: () => void;
  onSend: (text: string, images: string[]) => void;
}) {
  const [text, setText] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const maxMb = useUploadMb();
  const [pick, setPick] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const files = useRef<HTMLInputElement>(null);

  // "@ma" at the end of the text opens the picker
  const query = /(?:^|\s)@([\w.]*)$/.exec(text)?.[1];
  const options =
    query === undefined
      ? []
      : [
          ...(canPingRoom ? [{ id: 'room', name: 'room', hint: 'Everyone in this room', color: '' }] : []),
          ...mentionables.map((u) => ({ id: u.id, name: u.handle, hint: u.name, color: u.color })),
        ]
          .filter((o) => o.name.startsWith(query.toLowerCase()) || o.hint.toLowerCase().startsWith(query.toLowerCase()))
          .slice(0, 6);
  const choose = (name: string) => {
    setText((t) => t.replace(/@[\w.]*$/, `@${name} `));
    setPick(0);
    input.current?.focus();
  };

  // Taken now, not inside the state update: the input is cleared right after, and a deferred
  // update would find its file list empty (pictures picked after typing were dropped)
  const addFiles = (list: FileList | null) => {
    const taken = takeImages(list, images.length, maxMb);
    if (taken.length) setImages((all) => [...all, ...taken]);
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
                <UserAvatar user={{ name: o.hint, color: o.color, presence: 'offline' }} size={24} />
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
            <CornerUpLeft className="size-3.5" /> Replying to <span className="font-bold text-foreground">{replyTo.author.name}</span>
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
          {pictures && (
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
          )}
          <EmojiPicker align="start" onPick={(e) => setText((t) => t + e)}>
            <Button type="button" size="icon" variant="ghost" className="rounded-xl text-muted-foreground" aria-label="Emoji">
              <Smile />
            </Button>
          </EmojiPicker>
          <input
            ref={input}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setPick(0);
              if (e.target.value) onTyping?.();
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
          <Button type="submit" size="icon" className="rounded-xl" aria-label="Send">
            <Send />
          </Button>
        </form>
      </div>
    </div>
  );
}

/**
 * The small message box (the in-room chat panel): text, emoji, and optionally pictures (pick or
 * paste, like Messenger), shown as small previews above the line.
 */
export function Composer({
  placeholder,
  onSend,
  compact,
  maxLength,
  onTyping,
  pictures,
}: {
  placeholder: string;
  onSend: (text: string, images: string[]) => void;
  compact?: boolean;
  maxLength?: number;
  onTyping?: (typing: boolean) => void;
  /** Allow pictures (saved chats); Bubbles are text and emoji only. */
  pictures?: boolean;
}) {
  const [text, setText] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const maxMb = useUploadMb();
  const files = useRef<HTMLInputElement>(null);
  const input = useRef<HTMLInputElement>(null);
  // Taken now, not inside the state update (see FullComposer)
  const add = (list: FileList | File[] | null) => {
    const taken = takeImages(list, images.length, maxMb);
    if (taken.length) setImages((all) => [...all, ...taken]);
  };
  return (
    <form
      className={cn('flex flex-col rounded-2xl border bg-card p-1.5 shadow-sm focus-within:border-primary', compact && 'rounded-xl p-1')}
      onSubmit={(e) => {
        e.preventDefault();
        if (!text.trim() && !images.length) return;
        onSend(text.trim(), images);
        setText('');
        setImages([]);
        onTyping?.(false);
      }}
    >
      {images.length > 0 && (
        <div className="flex items-end gap-1.5 px-1 pt-1 pb-1.5">
          {images.map((src) => (
            <span key={src} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- local object URLs in the demo */}
              <img src={src} alt="" className="size-12 rounded-lg object-cover" />
              <button
                type="button"
                onClick={() => setImages((all) => all.filter((x) => x !== src))}
                className="absolute -top-1.5 -right-1.5 grid size-4.5 place-items-center rounded-full bg-foreground text-background"
                aria-label="Remove picture"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
          <span className="text-[10px] text-muted-foreground">
            {images.length}/{MAX_IMAGES}
          </span>
        </div>
      )}
      <div className="flex items-center gap-0.5">
        {pictures && (
          <>
            <input
              ref={files}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                add(e.target.files);
                e.target.value = '';
              }}
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-8 rounded-lg text-muted-foreground"
              aria-label="Add pictures"
              disabled={images.length >= MAX_IMAGES}
              onClick={() => files.current?.click()}
            >
              <ImagePlus />
            </Button>
          </>
        )}
        <EmojiPicker
          align="start"
          onPick={(e) => {
            setText((t) => (maxLength ? (t + e).slice(0, maxLength) : t + e));
            input.current?.focus();
          }}
        >
          <Button type="button" size="icon" variant="ghost" className="size-8 rounded-lg text-muted-foreground" aria-label="Emoji">
            <Smile />
          </Button>
        </EmojiPicker>
        <input
          ref={input}
          value={text}
          maxLength={maxLength}
          onChange={(e) => {
            setText(e.target.value);
            onTyping?.(e.target.value.length > 0);
          }}
          onPaste={(e) => {
            if (!pictures || !e.clipboardData.files.length) return;
            e.preventDefault();
            add([...e.clipboardData.files]);
          }}
          onBlur={() => onTyping?.(false)}
          placeholder={placeholder}
          className="h-9 min-w-0 flex-1 bg-transparent px-2 text-sm outline-none"
          aria-label={placeholder}
        />
        <Button type="submit" size="icon" className="rounded-xl" aria-label="Send">
          <Send />
        </Button>
      </div>
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

/** A Plus gift in a DM (feature 15). The months are already added; the card just says so. */
function GiftCard({ from, gift }: { from: string; gift: { months: number; note?: string } }) {
  return (
    <div className="mt-1 flex w-72 max-w-full flex-col gap-1 rounded-2xl bg-gradient-to-br from-secondary via-peach to-lavender p-4">
      <p className="text-2xl">🎁</p>
      <p className="font-black">
        {from} gifted {from === 'You' ? '' : 'you '}
        {gift.months} month{gift.months > 1 && 's'} of Plus ✨
      </p>
      {gift.note && <p className="text-sm italic">“{gift.note}”</p>}
      <p className="text-xs text-muted-foreground">Added to your Plus. Your rooms grow while it lasts.</p>
    </div>
  );
}
