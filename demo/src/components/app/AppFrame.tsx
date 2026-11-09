'use client';

import { PlaceHeader } from '@/features/place/PlaceHeader';
import { PlaceChat } from '@/features/place/PlaceChat';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Server } from '@/lib/mock';
import { useViewer } from '@/lib/viewer';

/**
 * The frame around every signed-in page except 3D rooms. Like Gather, there are no servers or
 * channel lists, only rooms: a slim header over Home and its pages (a floating card on the soft
 * gradient), and a room's own page is its permanent chat outside 3D (PlaceChat).
 */
export function HomeFrame({ children }: { children: React.ReactNode }) {
  const guest = useViewer() === 'guest';
  // Guests may browse Discover: Common rooms take anyone, no account needed
  const discover = usePathname() === '/discover';
  if (guest && !discover) return <GuestWall />;
  return (
    <div className="flex h-dvh flex-col gap-2 p-2">
      <PlaceHeader />
      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto rounded-3xl border bg-card shadow-soft">{children}</main>
    </div>
  );
}

/** A room's URL (mock servers stand in for rooms) opens its chat outside 3D. */
export function ServerFrame({ server }: { server: Server }) {
  if (useViewer() === 'guest') return <GuestWall />;
  return <PlaceChat key={server.id} server={server} />;
}

/**
 * Guests have no account, so no Home, friends or room chats: a guest link lets them into one room in
 * 3D and nothing else (feature 2). In the real app these pages send them to sign in.
 */
function GuestWall() {
  return (
    <div className="grid h-dvh place-items-center p-4">
      <div className="panel flex max-w-sm flex-col items-center gap-3 p-6 text-center">
        <span className="text-4xl">👋</span>
        <h1 className="text-xl font-black">This page needs an account</h1>
        <p className="text-sm text-muted-foreground">
          Guests can walk into the one room their guest link is for, or into a Common room. Home, friends and room chats come with an
          account.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Link href="/login" className="rounded-full bg-primary px-4 py-2 text-sm font-extrabold text-primary-foreground">
            Sign up, it’s free
          </Link>
          <Link href="/invite/cafe-chanom" className="rounded-full border bg-card px-4 py-2 text-sm font-extrabold hover:bg-muted">
            Open a guest link
          </Link>
        </div>
      </div>
    </div>
  );
}
