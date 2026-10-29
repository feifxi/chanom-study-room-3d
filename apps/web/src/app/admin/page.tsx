import type { Metadata } from 'next';
import { AdminLoader } from './AdminLoader';

export const metadata: Metadata = { title: 'Admin · Chanom Study Room', robots: { index: false } };

export default function AdminRoute() {
  return <AdminLoader />;
}
