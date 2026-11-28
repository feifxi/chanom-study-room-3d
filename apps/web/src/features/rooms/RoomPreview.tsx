'use client';

import { useRouter } from 'next/navigation';
import { JoinRoomDialog } from '@/features/place/JoinRoomDialog';
import { Scene } from '@/features/place/Scene';
import { useRoom, type ListedRoom, type Room } from './useRooms';

/**
 * A listed room's page for someone who isn't in it yet (a shared room link): the room's still
 * behind, the join preview on top. Closing it goes to Discover.
 */
export function RoomPreview({ room: initial }: { room: Room }) {
  const router = useRouter();
  const { data } = useRoom(initial.id, initial);
  const room = data ?? initial;
  const listed: ListedRoom = {
    id: room.id,
    name: room.name,
    emoji: room.emoji,
    description: room.description,
    mapId: room.mapId,
    thumbnail: room.thumbnail,
    // Only listed rooms reach here: private ones are a 404 for non-members
    visibility: room.visibility === 'open' ? 'open' : 'request',
    tags: room.tags,
    language: room.language,
    owner: room.owner,
    memberCount: room.memberCount,
    capacity: room.capacity,
    // A non-member's room view doesn't carry who's inside, so the preview leaves the count out; the
    // game server still says full at the door
    inside: room.inside.length,
    full: room.full,
    rules: room.showRules ? room.rules : null,
    me: room.me,
  };
  return (
    <div className="fixed inset-0 isolate">
      <Scene mapId={room.mapId} thumbnail={room.thumbnail} className="fixed" emojiClass="text-[9rem]" />
      <div className="fixed inset-0 -z-10 bg-black/35 backdrop-blur-sm" />
      <JoinRoomDialog room={listed} open onOpenChange={() => router.push('/discover')} />
    </div>
  );
}
