'use client';

import { PlaceHeader } from '@/features/place/PlaceHeader';
import { PlaceChat } from '@/features/place/PlaceChat';
import type { Server } from '@/lib/mock';

/**
 * The frame around every signed-in page except 3D rooms. Like Gather, there are no servers or
 * channel lists, only rooms: a slim header over Home and its pages (a floating card on the soft
 * gradient), and a room's own page is its permanent chat outside 3D (PlaceChat).
 */
export function HomeFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh flex-col gap-2 p-2">
      <PlaceHeader />
      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto rounded-3xl border bg-card shadow-soft">{children}</main>
    </div>
  );
}

/** A room's URL (mock servers stand in for rooms) opens its chat outside 3D. */
export function ServerFrame({ server }: { server: Server }) {
  return <PlaceChat key={server.id} server={server} />;
}
