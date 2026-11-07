import { RoomLoader } from '@/features/room/RoomLoader';

/** The 3D room, full screen (outside the app shell). `?guest=Name` shows the guest experience. */
export default async function RoomPage({ params, searchParams }: PageProps<'/servers/[serverId]/rooms/[roomId]'>) {
  const { serverId, roomId } = await params;
  const { guest } = await searchParams;
  return (
    <RoomLoader key={`${serverId}/${roomId}`} serverId={serverId} roomId={roomId} guestName={typeof guest === 'string' ? guest : null} />
  );
}
