'use client';

import dynamic from 'next/dynamic';

// Admin data comes from the game server with a session cookie, so this page renders client-side only.
const AdminPage = dynamic(() => import('@/features/admin/AdminPage').then((m) => m.AdminPage), { ssr: false });

export function AdminLoader() {
  return <AdminPage />;
}
