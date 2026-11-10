'use client';

import { PhoneTabs, PlaceHeader } from '@/features/place/PlaceHeader';
import { PlaceChat } from '@/features/place/PlaceChat';
import Link from 'next/link';
import { RoomShot, SplitScreen } from './SplitScreen';
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
      <PhoneTabs />
    </div>
  );
}

/** A room's URL (mock servers stand in for rooms) opens its chat outside 3D. */
export function ServerFrame({ server }: { server: Server }) {
  if (useViewer() === 'guest') return <GuestWall />;
  return <PlaceChat key={server.id} server={server} />;
}

/** What an account adds, shown to guests on pages they can't open. */
const PERKS = [
  ['🏠', 'Your own rooms', 'Make a room, pick a map, invite friends with a link'],
  ['💬', 'Friends and messages', 'See who’s out and walk over to them'],
  ['📈', 'Focus and quests', 'Your study hours, the weekly ranking, coins for the Shop'],
] as const;

/**
 * Guests have no account, so no Home, friends or room chats: a guest link lets them into one room in
 * 3D and nothing else (feature 2). Instead of a dead end, the page shows what signing up adds and
 * keeps Discover one tap away. In the real app these pages send them to sign in.
 */
function GuestWall() {
  return (
    <SplitScreen
      aside={
        <>
          <h2 className="max-w-md text-4xl font-black tracking-tight text-balance">Your friends are one link away.</h2>
          <RoomShot
            chips={[
              { text: <>🍓 Chanom Friends · 3 inside</>, className: '-top-4 left-6' },
              { text: <>👋 Mai waved at you</>, className: '-bottom-5 right-8' },
            ]}
          />
        </>
      }
    >
      <div className="panel p-6 sm:p-8">
        <span className="text-4xl">👋</span>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-balance">This part of Connecta needs an account</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          As a guest you can walk into the room your link is for, or any Common room. It’s free and takes a minute.
        </p>
        <ul className="mt-5 flex flex-col gap-3">
          {PERKS.map(([emoji, title, text]) => (
            <li key={title} className="flex items-start gap-3">
              <span className="grid size-10 flex-none place-items-center rounded-2xl bg-secondary text-lg">{emoji}</span>
              <span className="min-w-0">
                <span className="block text-sm font-black">{title}</span>
                <span className="block text-sm text-muted-foreground">{text}</span>
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-col gap-2">
          <Link
            href="/login"
            className="rounded-full bg-primary px-4 py-2.5 text-center text-sm font-extrabold text-primary-foreground shadow-sm hover:brightness-105"
          >
            Sign up, it’s free
          </Link>
          <Link href="/discover" className="rounded-full border bg-card px-4 py-2.5 text-center text-sm font-extrabold hover:bg-muted">
            Browse Common rooms
          </Link>
        </div>
      </div>
    </SplitScreen>
  );
}
