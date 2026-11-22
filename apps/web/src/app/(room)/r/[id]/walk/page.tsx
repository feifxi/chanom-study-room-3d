import { notFound, redirect } from 'next/navigation';
import { getMe } from '@/features/account/server';
import { getRoom } from '@/features/rooms/server';
import { WalkIn } from '@/features/rooms/WalkIn';

/**
 * Walking into a room in 3D, full screen (outside the app shell). Members, and guests with a guest
 * pass; anyone else goes to the room's page (the preview, to join first).
 */
export default async function WalkPage({ params }: PageProps<'/r/[id]/walk'>) {
  const { id } = await params;
  const me = await getMe();
  if (!me) redirect('/login');
  const room = await getRoom(id);
  if (!room) notFound();
  if (!room.me.role && !room.me.guestUntil) redirect(`/r/${id}`);
  // A full account halfway through deleting finishes that first (the login page asks)
  if (!me.isGuest && (!me.signedUp || me.deleteAt)) redirect('/login');
  return <WalkIn room={room} guestName={me.isGuest ? me.name : null} />;
}
