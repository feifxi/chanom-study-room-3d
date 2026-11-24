import { notFound } from 'next/navigation';
import { getMe } from '@/features/account/server';
import { AdminFrame } from '@/features/admin/AdminFrame';

/** The Connecta team's admin site (docs/features/16-admin.md): "page not found" for everyone else, so it isn't advertised. */
export default async function AdminLayout({ children }: LayoutProps<'/admin'>) {
  const me = await getMe();
  if (!me?.team) notFound();
  return <AdminFrame>{children}</AdminFrame>;
}
