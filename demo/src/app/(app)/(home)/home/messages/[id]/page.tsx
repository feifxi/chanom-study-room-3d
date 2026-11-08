'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Ban, BellOff, Flag, MoreHorizontal, Play, Search, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { ChatThread, DmLocked } from '@/components/chat/Chat';
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
import { DMS, SERVERS, serverById, userById } from '@/lib/mock';

const AvatarPreview = dynamic(() => import('@/features/avatar/AvatarPreview').then((m) => m.AvatarPreview), { ssr: false });

/**
 * A 1-to-1 chat (text only: there are no calls; to talk, meet in a room). The friend's profile is on
 * the side with where they are right now and the rooms you share, so "come join" is one tap.
 */
export default function DmPage() {
  const { id } = useParams<{ id: string }>();
  const u = userById(id);
  const dm = DMS.find((d) => d.with === id);
  const [state, setState] = useState<'friends' | 'unfriended' | 'blocked'>(dm?.unfriended ? 'unfriended' : 'friends');
  // Only friends see where you are (presence is private), so an unfriended or blocked chat hides it
  const where = state === 'friends' && u.inRoom && serverById(u.inRoom.serverId);
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
          <UserAvatar user={u} size={36} presence={state === 'friends'} />
          <div className="min-w-0 flex-1">
            <p className="font-black">{u.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {where ? `In ${where.emoji} ${where.name} · ` : ''}
              {state === 'friends' ? (u.activity ?? PRESENCE_LABEL[u.presence]) : `@${u.handle}`}
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
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => {
                  setState('blocked');
                  toast(`${u.name} is blocked. Their messages are hidden in rooms you share.`);
                }}
              >
                <Ban /> Block
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onSelect={() => toast('Report sent. Thanks for telling us.')}>
                <Flag /> Report
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <ChatThread
          key={id}
          initial={dm?.messages ?? []}
          unread={dm?.unread}
          members={['me', u.id]}
          placeholder={`Message ${u.name}`}
          replier={id === 'mai' ? { id: 'mai', text: 'hehe ok, see you there 🐱' } : undefined}
          intro={
            <div className="flex flex-col items-start gap-2 px-6 pt-8">
              <UserAvatar user={u} size={72} />
              <p className="text-2xl font-black">{u.name}</p>
              <p className="text-sm text-muted-foreground">This is the start of your messages with {u.name}.</p>
            </div>
          }
          locked={
            state === 'friends' ? undefined : (
              <DmLocked
                name={u.name}
                state={state}
                onAction={() => {
                  if (state === 'unfriended') toast.success(`Friend request sent to ${u.name}`);
                  else {
                    setState(dm?.unfriended ? 'unfriended' : 'friends');
                    toast(`${u.name} is unblocked`);
                  }
                }}
              />
            )
          }
        />
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
