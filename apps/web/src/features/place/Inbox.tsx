'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Armchair, AtSign, Bell, CheckCheck, DoorOpen, Gift, MessageCircle, UserCheck, UserPlus, type LucideIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PersonFace } from '@/components/PersonFace';
import { useInbox, useReadInbox, type Notification } from '@/features/inbox/useInbox';
import { cn } from '@/lib/utils';

type Kind = Notification['kind'];

const ICON: Record<Kind, [LucideIcon, string]> = {
  friend_request: [UserPlus, 'bg-lavender text-lavender-ink'],
  friend_accepted: [UserPlus, 'bg-lavender text-lavender-ink'],
  join_request: [UserCheck, 'bg-mint text-mint-ink'],
  joined: [DoorOpen, 'bg-mint text-mint-ink'],
  mention: [AtSign, 'bg-sky text-sky-ink'],
  messages: [MessageCircle, 'bg-sky text-sky-ink'],
  space: [Armchair, 'bg-mint text-mint-ink'],
  gift: [Gift, 'bg-peach text-peach-ink'],
};

/** "now", "5m", "3h", "2d" (outside the component: render can't read the clock). */
function since(iso: string) {
  const minutes = Math.floor((Date.now() - Date.parse(iso)) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours}h ago` : `${Math.floor(hours / 24)}d ago`;
}

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
 * The inbox (🔔 in the header): everything that happened for you while you were elsewhere, from the
 * API, live. Friend requests and accepted ones, join requests (yours let in, or new ones for rooms
 * you mod), @mentions and @room, and a room's messages if you picked Every message for it. Space in
 * a full room, events, gifts and team actions join as their features are built. Not DMs (Messages
 * has its own badge) and not "a friend walked in" (decided: no pings for that). Inside a room the
 * same things arrive as toasts, and the inbox keeps them for later.
 */
export function Inbox() {
  const [open, setOpen] = useState(false);
  const [onlyUnread, setOnlyUnread] = useState(false);
  const inbox = useInbox();
  const markRead = useReadInbox();
  const notes = inbox.data?.items ?? [];
  const unread = inbox.data?.unread ?? 0;
  const shown = onlyUnread ? notes.filter((n) => n.unread) : notes;
  const read = (id?: string) => markRead.mutate(id ? [id] : undefined);

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
                  if (n.unread) read(n.id);
                  setOpen(false);
                }}
                className="flex items-start gap-2.5 rounded-2xl px-2 py-2 hover:bg-muted"
              >
                {n.person ? (
                  <PersonFace who={n.person} size={34} />
                ) : (
                  <span className={cn('grid size-[34px] flex-none place-items-center rounded-full', tint)}>
                    <Icon className="size-4" />
                  </span>
                )}
                <span className={cn('min-w-0 flex-1 text-sm', !n.unread && 'text-muted-foreground')}>
                  <Rich text={n.text} />
                  <span className="block text-xs text-muted-foreground">{since(n.at)}</span>
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
