import { notFound } from 'next/navigation';
import { ServerFrame } from '@/components/app/AppFrame';
import { serverById } from '@/lib/mock';

export default async function ServerLayout({ children, params }: LayoutProps<'/servers/[serverId]'>) {
  const { serverId } = await params;
  const server = serverById(serverId);
  if (!server) notFound();
  // The room's chat is the whole page; the page file below only exists for the route
  return (
    <>
      <ServerFrame server={server} />
      {children}
    </>
  );
}
