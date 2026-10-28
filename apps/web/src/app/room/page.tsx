import { Suspense } from 'react';
import { RoomLoader } from './RoomLoader';

export default function RoomPage() {
  return (
    <Suspense fallback={<RoomFallback />}>
      <RoomLoader />
    </Suspense>
  );
}

function RoomFallback() {
  return <div className="grid h-full place-items-center text-sm text-muted">Opening the room…</div>;
}
