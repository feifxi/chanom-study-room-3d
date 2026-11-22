'use client';

import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import type { ChatMessage } from '@/features/chat/useRoomChat';
import { useFriendAction } from '@/features/friends/useFriends';
import { OutLink } from '@/features/room/LeaveRoom';
import { problem } from '@/features/rooms/useRooms';
import { dmCards } from './useDms';

/**
 * The DM cards (feature 5). **Ask to join:** someone wants into the room you're in; you answer Send
 * invite (they get a link back) or Not now. **Invite:** a link to a room, a member invite or a
 * 24-hour guest pass.
 */
export function DmCard({ m, mine }: { m: ChatMessage; mine: boolean }) {
  const card = m.card;
  const answer = useFriendAction(dmCards.answer, undefined, true);
  if (!card) return null;

  if (m.kind === 'ask') {
    const open = card.state === 'open';
    return (
      <div className="mt-1 flex w-72 max-w-full flex-col gap-2 rounded-2xl bg-gradient-to-br from-secondary to-lavender p-4">
        <p className="text-2xl">🚪</p>
        <p className="font-black">{mine ? 'You asked to join' : `${m.author.name} wants to join you`}</p>
        <p className="text-sm text-muted-foreground">
          {open
            ? mine
              ? 'Waiting for an answer. If it’s a yes, the invite lands here.'
              : 'Send an invite and they can walk into your room.'
            : card.state === 'sent'
              ? mine
                ? 'They said yes 💌'
                : 'You sent an invite'
              : mine
                ? 'Not this time'
                : 'You said not now'}
        </p>
        {open && !mine && (
          <div className="flex gap-2">
            <Button
              size="sm"
              className="rounded-full font-extrabold"
              disabled={answer.isPending}
              onClick={() => answer.mutate({ messageId: m.id, send: true }, { onError: (e) => toast.error(problem(e)) })}
            >
              Send invite
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full font-bold"
              disabled={answer.isPending}
              onClick={() => answer.mutate({ messageId: m.id, send: false }, { onError: (e) => toast.error(problem(e)) })}
            >
              Not now
            </Button>
          </div>
        )}
      </div>
    );
  }

  const invite = card.invite;
  const room = card.room;
  if (!invite || !room) return null;
  const guest = invite.kind === 'guest';
  return (
    <div className="mt-1 flex w-72 max-w-full flex-col gap-2 rounded-2xl bg-gradient-to-br from-peach to-secondary p-4">
      <p className="text-2xl">{room.emoji}</p>
      <p className="font-black">{mine ? `You sent an invite to ${room.name}` : `Come hang out in ${room.name}`}</p>
      <p className="text-sm text-muted-foreground">{guest ? 'A guest pass: walk in for 24 hours' : 'An invite to join as a member'}</p>
      {!mine && (
        <OutLink
          href={guest ? `/g/${invite.code}` : `/i/${invite.code}`}
          className="w-fit rounded-full bg-primary px-4 py-1.5 text-sm font-extrabold text-primary-foreground hover:bg-primary/90"
        >
          {guest ? 'Walk in' : 'Join'}
        </OutLink>
      )}
    </div>
  );
}
