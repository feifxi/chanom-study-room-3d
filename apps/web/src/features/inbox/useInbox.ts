'use client';

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useMe } from '@/features/account/useMe';
import { liveSocket } from '@/features/chat/live';
import type { ChatMessage } from '@/features/chat/useRoomChat';
import { DMS_KEY } from '@/features/chat/useRoomChat';
import type { DmSummary } from '@/features/dms/useDms';
import { inRoomNow } from '@/features/presence/usePresence';
import { api, type Schemas } from '@/lib/api/client';

export type Notification = Schemas['Notification'];
type Inbox = Schemas['Inbox'];

export const INBOX_KEY = ['inbox'] as const;

const signedUp = (me?: Schemas['Me'] | null) => !!me && !me.isGuest && me.signedUp;

export function useInbox() {
  const { data: me } = useMe();
  return useQuery({
    queryKey: INBOX_KEY,
    queryFn: async () => {
      const { data, response } = await api.GET('/api/notifications');
      if (!data) throw new Error(`${response.status}`);
      return data;
    },
    enabled: signedUp(me),
  });
}

/** Opening an item (ids) or "Mark all read" (none). Updates the badge at once. */
export function useReadInbox() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (ids?: string[]) => {
      await api.POST('/api/notifications/read', { body: ids ? { ids } : {} });
    },
    onMutate: (ids) =>
      client.setQueryData<Inbox>(INBOX_KEY, (inbox) => {
        if (!inbox) return inbox;
        const items = inbox.items.map((n) => (!ids || ids.includes(n.id) ? { ...n, unread: false } : n));
        return { items, unread: items.filter((n) => n.unread).length };
      }),
  });
}

/** "**Mai** sent you…" without the stars, for a toast. */
export const plain = (text: string) => text.replaceAll('**', '');

/**
 * Mounted once for the whole app: new inbox items go into the bell live. Inside a room (3D open)
 * they also pop up as toasts, and so do DMs from chats you haven't muted.
 */
export function InboxListener() {
  const { data: me } = useMe();
  const client = useQueryClient();
  const on = signedUp(me);
  const myId = me?.id;

  useEffect(() => {
    if (!on) return;
    const socket = liveSocket();
    const onNotification = ({ notification, unread }: { notification: Notification; unread: number }) => {
      client.setQueryData<Inbox>(INBOX_KEY, (inbox) => ({
        items: [notification, ...(inbox?.items ?? []).filter((n) => n.id !== notification.id)],
        unread,
      }));
      if (inRoomNow()) toast(plain(notification.text));
    };
    // A message comes again when it changes (a reaction, an edit, a card answered): toast it once
    const toasted = new Set<string>();
    const onMessage = (m: ChatMessage) => {
      if (!m.dmId || !inRoomNow() || m.author.id === myId || !m.ready || m.editedAt || toasted.has(m.id)) return;
      if (Date.now() - Date.parse(m.createdAt) > 60_000) return;
      const dm = client.getQueryData<DmSummary[]>(DMS_KEY)?.find((d) => d.id === m.dmId);
      if (dm?.muted) return;
      toasted.add(m.id);
      toast(`${m.author.name}: ${m.text || (m.pictures.length ? '📷 a picture' : m.kind === 'ask' ? '🚪 asked to join' : '💌 an invite')}`);
    };
    let connectedBefore = socket.connected;
    // Back after a drop: catch up on what we missed
    const onConnect = () => {
      if (connectedBefore) void client.invalidateQueries({ queryKey: INBOX_KEY });
      connectedBefore = true;
    };
    socket.on('notification', onNotification);
    socket.on('message', onMessage);
    socket.on('connect', onConnect);
    return () => {
      socket.off('notification', onNotification);
      socket.off('message', onMessage);
      socket.off('connect', onConnect);
    };
  }, [on, client, myId]);

  return null;
}
