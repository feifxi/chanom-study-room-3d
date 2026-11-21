'use client';

import { useState } from 'react';
import { ReportRoomDialog } from './ReportRoomDialog';
import { Check, Users } from 'lucide-react';
import { toast } from 'sonner';
import { AvatarStack } from '@/components/UserAvatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { MAPS, userById, type OpenRoom } from '@/lib/mock';

/** Shown before joining when the owner turned on "Show rules before joining" (demo: every room has these). */
const RULES = ['Be kind, we’re all here to hang out', 'No spam or self-promo', 'Keep voice chill in the study corner'];

/**
 * The preview before you join someone's room (our version of Discord's server preview): the map,
 * what it's about, who's inside, and its rules. You become a member before walking in:
 * - **Open**: one button, "Join & walk in"
 * - **Ask to join**: an optional note for the mods, then wait (mods get a notification)
 * The room's chat stays hidden until you're a member.
 */
export function JoinRoomDialog({ room, open, onOpenChange }: { room: OpenRoom; open: boolean; onOpenChange: (o: boolean) => void }) {
  const map = MAPS.find((m) => m.id === room.mapId)!;
  const friends = (room.friendsInside ?? []).map(userById);
  const full = room.inside >= room.capacity;
  const [note, setNote] = useState('');
  const [asked, setAsked] = useState(false);
  const [report, setReport] = useState(false);

  const join = () => {
    onOpenChange(false);
    toast.success(
      full ? `You joined ${room.name}. It’s full right now: we’ll tell you when a spot opens.` : `Welcome to ${room.name}! Walking you in…`,
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] gap-0 overflow-hidden rounded-3xl p-0 sm:max-w-md">
        <div className={cn('grid h-32 place-items-center text-6xl', map.tint)}>{room.emoji}</div>
        <div className="flex flex-col gap-4 p-6">
          <div>
            <p className="text-xs font-black tracking-wider text-muted-foreground uppercase">
              {room.ask ? 'Ask to join' : 'Open room'} · by {room.owner}
            </p>
            <DialogTitle className="text-2xl font-black tracking-[-0.03em]">{room.name}</DialogTitle>
            <DialogDescription>{room.blurb}</DialogDescription>
          </div>

          <div className="flex flex-wrap gap-2 text-xs font-bold">
            <span className="rounded-full bg-muted px-2.5 py-1">
              {map.emoji} {map.name}
            </span>
            <span className={cn('rounded-full px-2.5 py-1', full ? 'bg-peach text-peach-ink' : 'bg-muted')}>
              {room.inside}/{room.capacity} inside{full ? ' · full' : ''}
            </span>
            <span className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
              <Users className="size-3" /> {room.members.toLocaleString()} members
            </span>
            {room.tags.map((t) => (
              <span key={t} className="rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground">
                {t}
              </span>
            ))}
          </div>
          {friends.length > 0 && (
            <p className="flex items-center gap-1.5 text-sm font-bold">
              <AvatarStack users={friends} size={22} /> {friends.map((f) => f.name).join(', ')} {friends.length > 1 ? 'are' : 'is'} here
            </p>
          )}

          <div className="rounded-2xl bg-muted/60 p-3">
            <p className="text-sm font-extrabold">Room rules</p>
            <ul className="mt-1 flex flex-col gap-0.5 text-sm">
              {RULES.map((r) => (
                <li key={r} className="flex gap-1.5">
                  <Check className="mt-0.5 size-3.5 flex-none text-primary" /> {r}
                </li>
              ))}
            </ul>
          </div>

          {room.ask ? (
            asked ? (
              <p className="rounded-2xl bg-mint p-3 text-sm font-semibold text-mint-ink">
                Request sent 💌 The mods will let you in, and you’ll get a notification. It shows on your Home as “Waiting”.
              </p>
            ) : (
              <form
                className="flex flex-col gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  setAsked(true);
                }}
              >
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={150}
                  placeholder="Say hi to the mods (optional), e.g. “I’m in Mai’s class”"
                  className="min-h-16 rounded-2xl"
                />
                <Button type="submit" className="h-11 rounded-2xl font-extrabold">
                  Ask to join
                </Button>
              </form>
            )
          ) : (
            <Button onClick={join} className="h-11 rounded-2xl font-extrabold">
              {full ? 'Join · tell me when there’s a spot' : 'Join & walk in'}
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
      <ReportRoomDialog name={room.name} open={report} onOpenChange={setReport} />
    </Dialog>
  );
}
