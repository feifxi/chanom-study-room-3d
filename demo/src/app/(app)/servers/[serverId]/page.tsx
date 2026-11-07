import { notFound } from 'next/navigation';
import { ServerHomeVariants } from '@/features/server/ServerHomeVariants';
import { serverById } from '@/lib/mock';

/** Server home. The design is a demo variant (Demo tab → Server page design) until one is picked. */
export default async function ServerHome({ params }: PageProps<'/servers/[serverId]'>) {
  const { serverId } = await params;
  if (!serverById(serverId)) notFound();
  return <ServerHomeVariants serverId={serverId} />;
}
