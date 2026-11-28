'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Users } from 'lucide-react';
import { JOIN_NOTE_MAX } from '@connecta/shared';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { roomsApi, useRoomAction, type ListedRoom } from '@/features/rooms/useRooms';
import { cn } from '@/lib/utils';
import { mapFor, walkInHref } from './model';
import { ReportRoomDialog } from './ReportRoomDialog';

/**
 * The preview before you join someone's room (our version of Discord's server preview): the map,
 * what it's about, who runs it, and its rules. You become a member before walking in:
 * - **Open**: one button, "Join & walk in"
 * - **Ask to join**: an optional note for the mods, then wait
 * The room's chat stays hidden until you're a member.
 */
export function JoinRoomDialog({ room, open, onOpenChange }: { room: ListedRoom; open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter();
  const map = mapFor(room.mapId);
  const { inside, full } = room;
  const [note, setNote] = useState('');
  const [report, setReport] = useState(false);
  const rules =
    room.rules
      ?.split('\n')
      .map((r) => r.replace(/^\d+\.\s*/, '').trim())
      .filter(Boolean) ?? [];
  const askAgain = room.me.askAgainAt && new Date(room.me.askAgainAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

  const join = useRoomAction(roomsApi.join, () => {
    onOpenChange(false);
    if (full) {
      toast.success(`You joined ${room.name}. It’s full right now: Walk in from Home once someone leaves.`);
      return;
    }
    toast.success(`Welcome to ${room.name}! Walking you in…`);
    router.push(walkInHref(room));
  });
  const ask = useRoomAction(roomsApi.ask);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] gap-0 overflow-hidden rounded-3xl p-0 sm:max-w-md">
        <div className={cn('grid h-32 place-items-center text-6xl', map.tint)}>{room.emoji}</div>
        <div className="flex flex-col gap-4 p-6">
          <div>
            <p className="text-xs font-black tracking-wider text-muted-foreground uppercase">
              {room.visibility === 'request' ? 'Ask to join' : 'Open room'} · by {room.owner.name}
            </p>
            <DialogTitle className="text-2xl font-black tracking-[-0.03em]">{room.name}</DialogTitle>
            <DialogDescription>{room.description || map.blurb}</DialogDescription>
          </div>

          <div className="flex flex-wrap gap-2 text-xs font-bold">
            <span className="rounded-full bg-muted px-2.5 py-1">
              {map.emoji} {map.name}
            </span>
            {inside > 0 && (
              <span className={cn('rounded-full px-2.5 py-1', full ? 'bg-peach text-peach-ink' : 'bg-muted')}>
                {inside}/{room.capacity} inside{full ? ' · full' : ''}
              </span>
            )}
            <span className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
              <Users className="size-3" /> {room.memberCount.toLocaleString()} {room.memberCount === 1 ? 'member' : 'members'}
            </span>
            {[room.language, ...room.tags].filter(Boolean).map((t) => (
              <span key={t} className="rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground">
                {t}
              </span>
            ))}
          </div>

          {rules.length > 0 && (
            <div className="rounded-2xl bg-muted/60 p-3">
              <p className="text-sm font-extrabold">Room rules</p>
              <ul className="mt-1 flex flex-col gap-0.5 text-sm">
                {rules.map((r) => (
                  <li key={r} className="flex gap-1.5">
                    <Check className="mt-0.5 size-3.5 flex-none text-primary" /> {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {room.visibility === 'request' ? (
            room.me.requested ? (
              <p className="rounded-2xl bg-mint p-3 text-sm font-semibold text-mint-ink">
                Request sent 💌 The mods will let you in, and the room shows up on your Home.
              </p>
            ) : askAgain ? (
              <p className="rounded-2xl bg-muted p-3 text-sm font-semibold">Not this time. You can ask again on {askAgain}.</p>
            ) : (
              <form
                className="flex flex-col gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  ask.mutate({ id: room.id, note: note.trim() || undefined });
                }}
              >
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={JOIN_NOTE_MAX}
                  placeholder="Say hi to the mods (optional), e.g. “I’m in Mai’s class”"
                  className="min-h-16 rounded-2xl"
                />
                <Button type="submit" disabled={ask.isPending} className="h-11 rounded-2xl font-extrabold">
                  Ask to join
                </Button>
              </form>
            )
          ) : (
            <Button onClick={() => join.mutate(room.id)} disabled={join.isPending} className="h-11 rounded-2xl font-extrabold">
              {full ? 'Join (full right now)' : 'Join & walk in'}
            </Button>
          )}
          <p className="text-center text-xs text-muted-foreground">
            Members see the room chat and find it on Home. You can leave any time from its “…” menu.{' '}
            <button type="button" onClick={() => setReport(true)} className="font-bold hover:text-foreground hover:underline">
              Report room
            </button>
          </p>
        </div>
      </DialogContent>
      <ReportRoomDialog roomId={room.id} name={room.name} open={report} onOpenChange={setReport} />
    </Dialog>
  );
}
