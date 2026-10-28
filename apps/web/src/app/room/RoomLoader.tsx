'use client';

import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';

// The 3D room only makes sense in the browser (WebGL, WebSocket, localStorage).
const StudyRoomView = dynamic(() => import('@/features/room/StudyRoomView'), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-muted">Loading the 3D room…</div>,
});

export function RoomLoader() {
  const roomId = useSearchParams().get('id');
  return <StudyRoomView roomId={roomId} />;
}
