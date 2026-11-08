'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Ban, BellOff, Flag, MoreHorizontal, Play, Search, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Composer, MessageList } from '@/components/chat/Chat';
import { PRESENCE_LABEL, UserAvatar } from '@/components/UserAvatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DMS, SERVERS, serverById, userById, type Message } from '@/lib/mock';

const AvatarPreview = dynamic(() => import('@/features/avatar/AvatarPreview').then((m) => m.AvatarPreview), { ssr: false });

/**
 * A 1-to-1 chat (text only: there are no calls; to talk, meet in a room). The friend's profile is on
 * the side with where they are right now and the rooms you share, so "come join" is one tap.
 */
export default function DmPage() {
  const { id } = useParams<{ id: string }>();
  const u = userById(id);
  const [messages, setMessages] = useState<Message[]>(DMS.find((d) => d.with === id)?.messages ?? []);
  const where = u.inRoom && serverById(u.inRoom.serverId);
  const shared = SERVERS.filter((s) => s.members.includes(u.id));
  const yourRooms = SERVERS.filter((s) => !s.members.includes(u.id)).slice(0, 4);

  return (
    <div className="flex h-full">
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b px-4 py-3">
          <Link
            href="/home/messages"
            className="-ml-1 rounded-full p-1.5 text-muted-foreground hover:bg-muted md:hidden"
            aria-label="All messages"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <UserAvatar user={u} size={36} presence />
          <div className="min-w-0 flex-1">
            <p className="font-black">{u.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {where ? `In ${where.emoji} ${where.name} · ` : ''}
              {u.activity ?? PRESENCE_LABEL[u.presence]}
            </p>
          </div>
          {where && u.inRoom && (
            <Button asChild className="rounded-full font-extrabold">
              <Link href={`/servers/${where.id}/rooms/${u.inRoom.roomId}`}>
                <Play className="fill-current" /> Join {u.name}
              </Link>
            </Button>
          )}
          <Button size="icon" variant="ghost" className="rounded-full" aria-label="Search this chat">
            <Search />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="rounded-full" aria-label={`More for ${u.name}`}>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-2xl p-1.5">
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <UserPlus className="size-4" /> Invite to a room
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="rounded-2xl p-1.5">
                  {yourRooms.map((s) => (
                    <DropdownMenuItem key={s.id} onSelect={() => toast.success(`Invited ${u.name} to ${s.name}`)}>
                      {s.emoji} {s.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuItem onSelect={() => toast(`Muted ${u.name}: no notifications from this chat`)}>
                <BellOff /> Mute this chat
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => toast(`${u.name} is blocked`)}>
                <Ban /> Block
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onSelect={() => toast('Report sent. Thanks for telling us.')}>
                <Flag /> Report
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex flex-col items-start gap-2 px-6 pt-8">
            <UserAvatar user={u} size={72} />
            <p className="text-2xl font-black">{u.name}</p>
            <p className="text-sm text-muted-foreground">This is the start of your messages with {u.name}.</p>
          </div>
          <MessageList messages={messages} />
        </div>
        <div className="p-3">
          <Composer
            placeholder={`Message ${u.name}`}
            onSend={(text) => setMessages([...messages, { id: String(Date.now()), author: 'me', at: 'Now', text }])}
          />
        </div>
      </section>

      <aside className="hidden w-72 flex-none flex-col gap-4 overflow-y-auto border-l p-4 xl:flex">
        <div className="overflow-hidden rounded-3xl border">
          <div className="h-44 bg-gradient-to-b from-lavender to-peach">
            <AvatarPreview look={u.look} />
          </div>
          <div className="p-4">
            <p className="text-lg font-black">{u.name}</p>
            <p className="text-sm text-muted-foreground">@{u.handle}</p>
            {u.plus && (
              <span className="mt-2 inline-block rounded-full bg-secondary px-2 py-0.5 text-xs font-bold text-secondary-foreground">
                Plus ✨
              </span>
            )}
          </div>
        </div>
        {where && u.inRoom && (
          <div className="rounded-3xl bg-mint/60 p-4">
            <p className="text-xs font-bold text-mint-ink">Right now</p>
            <p className="font-black">
              {where.emoji} {where.name}
            </p>
            <p className="text-sm text-muted-foreground">{u.activity}</p>
            <Button asChild size="sm" className="mt-3 rounded-full font-extrabold">
              <Link href={`/servers/${where.id}/rooms/${u.inRoom.roomId}`}>
                <Play className="fill-current" /> Walk in
              </Link>
            </Button>
          </div>
        )}
        <div>
          <p className="mb-2 text-xs font-black tracking-wider text-muted-foreground uppercase">Rooms you share · {shared.length}</p>
          {shared.map((s) => (
            <Link
              key={s.id}
              href={`/servers/${s.id}`}
              className="flex items-center gap-2 rounded-xl p-1.5 text-sm font-bold hover:bg-muted"
            >
              <span className={`grid size-8 place-items-center rounded-xl ${s.tint}`}>{s.emoji}</span> {s.name}
            </Link>
          ))}
          {!shared.length && <p className="text-sm text-muted-foreground">None yet. Invite {u.name} to one of yours.</p>}
        </div>
      </aside>
    </div>
  );
}
