import { notFound } from 'next/navigation';
import { ServerSidebar } from '@/components/server/ServerSidebar';
import { serverById } from '@/lib/mock';

export default async function ServerLayout({ children, params }: LayoutProps<'/servers/[serverId]'>) {
  const { serverId } = await params;
  const server = serverById(serverId);
  if (!server) notFound();
  return (
    <>
      <ServerSidebar server={server} />
      <main className="flex min-w-0 flex-1 overflow-hidden rounded-3xl border bg-card shadow-soft">{children}</main>
    </>
  );
}
