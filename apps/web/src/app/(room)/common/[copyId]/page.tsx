import { CommonRoom } from '@/features/rooms/WalkIn';

/** A Common room copy in 3D. Still the demo's stand-in: the real model of templates and copies is feature 14's. */
export default async function CommonRoomPage({ params, searchParams }: PageProps<'/common/[copyId]'>) {
  const { copyId } = await params;
  const { guest } = await searchParams;
  return <CommonRoom copyId={copyId} guestName={typeof guest === 'string' ? guest : null} />;
}
