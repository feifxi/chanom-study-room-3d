'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AtSign, Bell, CalendarHeart, CheckCheck, DoorOpen, ShieldAlert, UserCheck, UserPlus, type LucideIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { UserAvatar } from '@/components/UserAvatar';
import { cn } from '@/lib/utils';
import { userById } from '@/lib/mock';

type Kind = 'friend' | 'room' | 'mention' | 'space' | 'event' | 'team';

interface Note {
  id: string;
  kind: Kind;
  /** Who it's about, shown as their avatar; otherwise the kind's icon. */
  from?: string;
  text: string;
  at: string;
  href: string;
  unread: boolean;
}

const ICON: Record<Kind, [LucideIcon, string]> = {
  friend: [UserPlus, 'bg-lavender text-lavender-ink'],
  room: [UserCheck, 'bg-mint text-mint-ink'],
  mention: [AtSign, 'bg-sky text-sky-ink'],
  space: [DoorOpen, 'bg-mint text-mint-ink'],
  event: [CalendarHeart, 'bg-peach text-peach-ink'],
  team: [ShieldAlert, 'bg-destructive/15 text-destructive'],
};

/** Demo inbox: one of each kind, newest first. Kept 30 days in the real app. */
const NOTES: Note[] = [
  {
    id: 'n1',
    kind: 'mention',
    from: 'jod',
    text: '**Jod** mentioned you in Chanom Friends: “@feifei library at 8?”',
    at: '5m',
    href: '/servers/chanom',
    unread: true,
  },
  { id: 'n2', kind: 'friend', from: 'bow', text: '**Bow** sent you a friend request', at: '20m', href: '/home/friends', unread: true },
  { id: 'n3', kind: 'room', text: '**2 people** want to join CPE Year 3 (you’re a mod)', at: '1h', href: '/servers/cpe', unread: true },
  { id: 'n4', kind: 'event', text: '**Draw & Guess · Sat 21:00** starts in 1 hour', at: '1h', href: '/home', unread: false },
  { id: 'n5', kind: 'space', text: 'There’s space in **Exam Hall** now', at: '3h', href: '/home', unread: false },
  {
    id: 'n6',
    kind: 'friend',
    from: 'earth',
    text: '**Earth** sent you an invite after you asked to join',
    at: '5h',
    href: '/home/messages',
    unread: false,
  },
  { id: 'n7', kind: 'room', text: 'You’re in! **Game Night Club** approved your request', at: '1d', href: '/discover', unread: false },
  {
    id: 'n8',
    kind: 'team',
    text: '**Connecta team:** a picture you posted was removed (rule: nothing sexual). Reply to our email to appeal.',
    at: '3d',
    href: '/home',
    unread: false,
  },
];

/** "**bold** rest" → bold parts, so names stand out without HTML in the data. */
function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split('**').map((part, i) =>
        i % 2 ? (
          <b key={i} className="font-black">
            {part}
          </b>
        ) : (
          part
        ),
      )}
    </>
  );
}

/**
 * The inbox (🔔 in the header): everything that happened for you while you were elsewhere. Friend
 * requests and accepted asks, join requests (yours approved, or new ones for rooms you mod),
 * @mentions in room chats, space in a full room, events starting, and team actions on your account.
 * Not DMs (Messages has its own badge) and not "a friend walked in" (decided: no pings for that).
 * Inside a room the same things arrive as toasts, and the inbox keeps them for later.
 */
export function Inbox() {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(NOTES);
  const [onlyUnread, setOnlyUnread] = useState(false);
  const unread = notes.filter((n) => n.unread).length;
  const shown = onlyUnread ? notes.filter((n) => n.unread) : notes;
  const read = (id?: string) => setNotes((all) => all.map((n) => (!id || n.id === id ? { ...n, unread: false } : n)));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative grid size-10 place-items-center rounded-full border bg-card text-muted-foreground shadow-sm hover:text-foreground"
          aria-label={unread ? `Inbox, ${unread} new` : 'Inbox'}
        >
          <Bell className="size-[18px]" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full border-2 border-card bg-primary px-1 text-[10px] font-black text-primary-foreground">
              {unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="flex max-h-[min(560px,80dvh)] w-[340px] flex-col rounded-3xl p-2">
        <div className="flex items-center gap-1 px-2 pt-1 pb-1.5">
          <p className="mr-auto text-[11px] font-black tracking-wider text-muted-foreground uppercase">Inbox</p>
          {(['All', 'Unread'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setOnlyUnread(f === 'Unread')}
              className={cn(
                'rounded-full px-2.5 py-0.5 text-xs font-extrabold',
                (f === 'Unread') === onlyUnread ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:bg-muted',
              )}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {shown.length === 0 && <p className="px-2 py-6 text-center text-sm text-muted-foreground">You’re all caught up ✨</p>}
          {shown.map((n) => {
            const [Icon, tint] = ICON[n.kind];
            return (
              <Link
                key={n.id}
                href={n.href}
                onClick={() => {
                  read(n.id);
                  setOpen(false);
                }}
                className="flex items-start gap-2.5 rounded-2xl px-2 py-2 hover:bg-muted"
              >
                {n.from ? (
                  <UserAvatar user={userById(n.from)} size={34} />
                ) : (
                  <span className={cn('grid size-[34px] flex-none place-items-center rounded-full', tint)}>
                    <Icon className="size-4" />
                  </span>
                )}
                <span className={cn('min-w-0 flex-1 text-sm', !n.unread && 'text-muted-foreground')}>
                  <Rich text={n.text} />
                  <span className="block text-xs text-muted-foreground">{n.at} ago</span>
                </span>
                {n.unread && <span className="mt-1.5 size-2 flex-none rounded-full bg-primary" aria-label="New" />}
              </Link>
            );
          })}
        </div>
        <button
          onClick={() => read()}
          disabled={!unread}
          className="mt-1 flex items-center justify-center gap-1.5 rounded-2xl px-2 py-2 text-sm font-extrabold text-primary hover:bg-muted disabled:text-muted-foreground disabled:hover:bg-transparent"
        >
          <CheckCheck className="size-4" /> Mark all read
        </button>
      </PopoverContent>
    </Popover>
  );
}
