'use client';

import dynamic from 'next/dynamic';

// The lobby is built from this browser's saved profile (localStorage), so it renders client-side only.
const Lobby = dynamic(() => import('@/features/lobby/Lobby').then((m) => m.Lobby), { ssr: false });

export function LobbyLoader() {
  return <Lobby />;
}
