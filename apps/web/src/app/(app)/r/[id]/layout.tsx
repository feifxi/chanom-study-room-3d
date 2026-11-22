import { notFound, redirect } from 'next/navigation';
import { RoomFrame } from '@/components/app/AppFrame';
import { getRoom } from '@/features/rooms/server';

/**
 * A room's page (/r/<id>): its chat outside 3D for members, or the preview before joining for a
 * listed room. A private room you're not in is a 404, so its existence isn't given away.
 */
export default async function RoomLayout({ children, params }: LayoutProps<'/r/[id]'>) {
  const { id } = await params;
  const room = await getRoom(id);
  if (!room) notFound();
  // A guest pass (and no membership) is for walking in, not for the chat
  if (!room.me.role && room.me.guestUntil) redirect(`/r/${id}/walk`);
  return (
    <>
      <RoomFrame room={room} />
      {children}
    </>
  );
}
