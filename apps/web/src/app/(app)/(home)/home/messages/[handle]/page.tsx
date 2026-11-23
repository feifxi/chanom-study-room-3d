'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Ban, Bell, BellOff, Flag, Gift, MoreHorizontal, UserMinus } from 'lucide-react';
import { GiftPlusDialog } from '@/components/app/GiftPlusDialog';
import { toast } from 'sonner';
import { PersonFace } from '@/components/PersonFace';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DmChat } from '@/features/dms/DmChat';
import { ReportDialog } from '@/features/moderation/ReportDialog';
import { muteDm, useDmWith } from '@/features/dms/useDms';
import { friendsApi, useFriendAction } from '@/features/friends/useFriends';
import { mapFor } from '@/features/place/model';

const AvatarPreview = dynamic(() => import('@/features/avatar/AvatarPreview').then((m) => m.AvatarPreview), { ssr: false });

/**
 * A 1-to-1 chat (no calls: to talk, meet in a room). Their profile is on the side with the rooms
 * you share, so "come join" is one tap. "…" mutes the chat (out of the badge, no toasts in a room).
 */
export default function DmPage() {
  const { handle } = useParams<{ handle: string }>();
  const dm = useDmWith(handle);
  const u = dm.data?.with;
  const remove = useFriendAction(friendsApi.remove, () => toast(`Removed ${u?.name}. They won’t be told.`));
  const mute = useFriendAction(muteDm, (_, { muted }) =>
    toast(muted ? `Muted. ${u?.name}’s messages won’t count in your badge.` : 'Unmuted'),
  );
  const block = useFriendAction(friendsApi.block, () => toast(`${u?.name} is blocked. Their messages are hidden in rooms you share.`));
  const [gifting, setGifting] = useState(false);
  const [reporting, setReporting] = useState(false);

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
          {u && <PersonFace who={u} size={36} />}
          <div className="min-w-0 flex-1">
            <p className="font-black">{u?.name ?? `@${handle}`}</p>
            <p className="truncate text-xs text-muted-foreground">@{handle}</p>
          </div>
          {u && dm.data?.friend && <GiftPlusDialog to={u} open={gifting} onOpenChange={setGifting} />}
          {u && <ReportDialog person={u} canBlock={!dm.data?.blocked} open={reporting} onOpenChange={setReporting} />}
          {u && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="rounded-full" aria-label={`More for ${u.name}`}>
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-2xl p-1.5">
                {dm.data?.id && (
                  <DropdownMenuItem onSelect={() => mute.mutate({ id: dm.data!.id!, muted: !dm.data!.muted })}>
                    {dm.data.muted ? (
                      <>
                        <Bell /> Unmute
                      </>
                    ) : (
                      <>
                        <BellOff /> Mute
                      </>
                    )}
                  </DropdownMenuItem>
                )}
                {dm.data?.friend && (
                  <DropdownMenuItem onSelect={() => setGifting(true)}>
                    <Gift /> Gift Plus
                  </DropdownMenuItem>
                )}
                {dm.data?.friend && (
                  <DropdownMenuItem onSelect={() => remove.mutate(u.id)}>
                    <UserMinus /> Remove friend
                  </DropdownMenuItem>
                )}
                {!dm.data?.blocked && (
                  <DropdownMenuItem variant="destructive" onSelect={() => block.mutate(u.id)}>
                    <Ban /> Block
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => setReporting(true)}>
                  <Flag /> Report
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </header>
        <DmChat key={handle} handle={handle} />
      </section>

      {dm.data && (
        <aside className="hidden w-72 flex-none flex-col gap-4 overflow-y-auto border-l p-4 xl:flex">
          <div className="overflow-hidden rounded-3xl border">
            <div className="h-44 bg-gradient-to-b from-lavender to-peach">
              {dm.data.with.look && <AvatarPreview look={dm.data.with.look} />}
            </div>
            <div className="p-4">
              <p className="text-lg font-black">{dm.data.with.name}</p>
              <p className="text-sm text-muted-foreground">@{dm.data.with.handle}</p>
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-black tracking-wider text-muted-foreground uppercase">
              Rooms you share · {dm.data.sharedRooms.length}
            </p>
            {dm.data.sharedRooms.map((r) => (
              <Link key={r.id} href={`/r/${r.id}`} className="flex items-center gap-2 rounded-xl p-1.5 text-sm font-bold hover:bg-muted">
                <span className={`grid size-8 place-items-center rounded-xl ${mapFor(r.mapId).tint}`}>{r.emoji}</span> {r.name}
              </Link>
            ))}
            {!dm.data.sharedRooms.length && (
              <p className="text-sm text-muted-foreground">None yet. Invite {dm.data.with.name} to one of yours.</p>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}
