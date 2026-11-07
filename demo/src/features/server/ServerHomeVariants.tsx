'use client';

import { serverById } from '@/lib/mock';
import { useVariant } from '@/lib/variants';
import { ServerChatFirst } from './ServerChatFirst';
import { ServerClassic } from './ServerClassic';
import { ServerLobby } from './ServerLobby';

/** Picks the server home design chosen in the Demo tab. */
export function ServerHomeVariants({ serverId }: { serverId: string }) {
  const server = serverById(serverId)!;
  const variant = useVariant('server');
  return variant === 'lobby' ? (
    <ServerLobby server={server} />
  ) : variant === 'chat' ? (
    <ServerChatFirst server={server} />
  ) : (
    <ServerClassic server={server} />
  );
}
