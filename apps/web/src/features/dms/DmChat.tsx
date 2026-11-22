'use client';

import type { ReactNode } from 'react';
import { DmLocked } from '@/components/chat/Chat';
import { FriendFace } from '@/features/presence/FriendFace';
import { colorOf, ThreadChat } from '@/features/chat/RoomChat';
import { MiniChat } from '@/features/chat/MiniRoomChat';
import { friendsApi, useFriendAction } from '@/features/friends/useFriends';
import { toast } from 'sonner';
import { useDmWith, type DmOpen } from './useDms';

/**
 * A DM with someone (by @handle), full size (the Messages page, the big chat window in 3D) or
 * `mini` (the Chat panel in 3D). Friends can write; otherwise it's read-only history with a way
 * back (Add friend, or Unblock).
 */
export function DmChat({ handle, mini, onOpen, className }: { handle: string; mini?: boolean; onOpen?: () => void; className?: string }) {
  const dm = useDmWith(handle);
  if (dm.isPending) return <p className="m-auto animate-pulse text-sm font-bold text-muted-foreground">Opening the chat…</p>;
  if (!dm.data) return <p className="m-auto text-sm font-bold text-muted-foreground">There’s nobody called @{handle}.</p>;
  const d = dm.data;
  const locked = d.friend ? undefined : <Locked dm={d} />;
  const placeholder = `Message ${d.with.name}`;

  // No chat yet and not friends: nothing to read, only the way to become friends
  if (!d.id) return <div className="mt-auto p-3">{locked}</div>;
  if (mini) return <MiniChat thread={{ dm: d.id }} placeholder={placeholder} locked={locked} onOpen={onOpen ?? (() => {})} />;
  return (
    <ThreadChat
      thread={{ dm: d.id }}
      className={className}
      placeholder={placeholder}
      locked={locked}
      mentionables={d.with.handle ? [{ id: d.with.id, handle: d.with.handle, name: d.with.name, color: colorOf(d.with) }] : []}
      intro={<DmIntro dm={d} />}
    />
  );
}

function DmIntro({ dm }: { dm: DmOpen }): ReactNode {
  return (
    <div className="flex flex-col items-start gap-2 px-6 pt-8">
      <FriendFace who={dm.with} size={72} />
      <p className="text-2xl font-black">{dm.with.name}</p>
      <p className="text-sm text-muted-foreground">This is the start of your messages with {dm.with.name}.</p>
    </div>
  );
}

/** Unfriended: Add friend. Blocked by you: Unblock. */
function Locked({ dm }: { dm: DmOpen }) {
  const add = useFriendAction(friendsApi.add, (r) =>
    toast.success(r.status === 'friends' ? `You and ${dm.with.name} are friends again 💖` : `Friend request sent to ${dm.with.name}`),
  );
  const unblock = useFriendAction(friendsApi.unblock, () => toast(`${dm.with.name} is unblocked`));
  return (
    <DmLocked
      name={dm.with.name}
      state={dm.blocked ? 'blocked' : 'unfriended'}
      onAction={() => (dm.blocked ? unblock.mutate(dm.with.id) : dm.with.handle && add.mutate(dm.with.handle))}
    />
  );
}
