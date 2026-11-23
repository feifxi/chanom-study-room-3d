'use client';

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type Schemas } from '@/lib/api/client';
import { useMe } from '@/features/account/useMe';
import { liveSocket } from '@/features/chat/live';
import { DMS_KEY } from '@/features/chat/useRoomChat';

export type DmSummary = Schemas['DmSummary'];
export type DmOpen = Schemas['DmOpen'];

function ok<T>(res: { data?: T; error?: unknown; response: Response }): T {
  if (res.error !== undefined || !res.response.ok) throw res.error ?? new Error(`${res.response.status}`);
  return res.data as T;
}

/**
 * Your DMs, newest first. A new message in any of them (live) refreshes the list, so the header's
 * count and the Messages page stay right wherever you are.
 */
export function useDms() {
  const client = useQueryClient();
  const { data: me } = useMe();
  const enabled = !!me?.signedUp && !me.isGuest;
  useEffect(() => {
    if (!enabled) return;
    const socket = liveSocket();
    const refresh = (e: { dmId?: string | null }) => {
      if (e.dmId) void client.invalidateQueries({ queryKey: DMS_KEY, exact: true });
    };
    socket.on('message', refresh);
    socket.on('message:deleted', refresh);
    return () => {
      socket.off('message', refresh);
      socket.off('message:deleted', refresh);
    };
  }, [client, enabled]);
  return useQuery({ queryKey: DMS_KEY, queryFn: async () => ok(await api.GET('/api/dms')), enabled });
}

/** Unread DMs in total, for badges (muted chats left out). */
export const dmUnread = (dms?: DmSummary[]) => dms?.reduce((n, d) => n + (d.muted ? 0 : d.unread), 0) ?? 0;

/** Your chat with someone (by @handle): its id, whether you're friends, the rooms you share. */
export function useDmWith(handle: string | null) {
  return useQuery({
    queryKey: [...DMS_KEY, 'with', handle],
    queryFn: async () => ok(await api.PUT('/api/dms/with/{handle}', { params: { path: { handle: handle! } } })),
    retry: false,
    enabled: !!handle,
  });
}

/** A DM's last message, for lists: "You: see you there", "a picture", "deleted". */
export function lastLine(d: DmSummary) {
  if (!d.last) return '';
  const text = d.last.deleted
    ? 'Message deleted'
    : d.last.kind === 'ask'
      ? '🚪 Asked to join'
      : d.last.kind === 'invite'
        ? '💌 An invite to a room'
        : d.last.kind === 'gift'
          ? '🎁 A Plus gift'
          : d.last.text || (d.last.pictures ? '📷 a picture' : '');
  return d.last.mine ? `You: ${text}` : text;
}

/**
 * The DM cards (feature 5): asking a friend to let you into their room, answering, and sending a
 * friend a link to one of yours. Each lands in your DM with them.
 */
export const dmCards = {
  ask: async (handle: string) => ok(await api.POST('/api/dms/with/{handle}/ask', { params: { path: { handle } } })),
  answer: async ({ messageId, send }: { messageId: string; send: boolean }) =>
    ok(await api.POST('/api/dms/asks/{messageId}', { params: { path: { messageId } }, body: { send } })),
  invite: async ({ handle, roomId }: { handle: string; roomId: string }) =>
    ok(await api.POST('/api/dms/with/{handle}/invite', { params: { path: { handle } }, body: { roomId } })),
};

/** Mute or unmute a chat for yourself; they're never told. */
export async function muteDm({ id, muted }: { id: string; muted: boolean }) {
  ok(await api.PUT('/api/dms/{id}/mute', { params: { path: { id } }, body: { muted } }));
}
