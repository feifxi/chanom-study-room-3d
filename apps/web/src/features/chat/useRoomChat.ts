'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { TYPING_MS } from '@connecta/shared';
import { toast } from 'sonner';
import { api, type Schemas } from '@/lib/api/client';
import { problem, ROOMS_KEY } from '@/features/rooms/useRooms';
import { liveSocket } from './live';

export type ChatMessage = Schemas['ChatMessage'];
type Page = Schemas['MessagePage'];
type Pages = InfiniteData<Page, unknown>;

const chatKey = (roomId: string) => ['chat', roomId] as const;

function ok<T>(res: { data?: T; error?: unknown; response: Response }): T {
  if (res.error !== undefined || !res.response.ok) throw res.error ?? new Error(`${res.response.status}`);
  return res.data as T;
}

/** Every message loaded, oldest first (pages come newest first). */
export const allMessages = (data?: Pages) => (data ? [...data.pages].reverse().flatMap((p) => p.messages) : []);

/** Puts a new or changed message into the loaded pages (by id), or takes one out. */
function patch(data: Pages | undefined, change: { upsert?: ChatMessage; remove?: string }): Pages | undefined {
  if (!data) return data;
  let found = false;
  const pages = data.pages.map((page) => {
    const messages = page.messages.flatMap((m) => {
      if (change.remove && m.id === change.remove) return [];
      if (change.upsert && m.id === change.upsert.id) {
        found = true;
        return [change.upsert];
      }
      return [m];
    });
    return { ...page, messages };
  });
  // New messages go at the end of the newest page
  if (change.upsert && !found) pages[0] = { ...pages[0]!, messages: [...pages[0]!.messages, change.upsert] };
  return { ...data, pages };
}

/**
 * A room's saved chat: the newest page, older ones on request, and everything that changes while
 * you look, live from the gateway. Writes go through the API and come back live to everyone else.
 */
export function useRoomChat(roomId: string, enabled = true) {
  const client = useQueryClient();
  const key = chatKey(roomId);
  const [typing, setTyping] = useState<{ name: string; until: number } | null>(null);

  const query = useInfiniteQuery({
    queryKey: key,
    enabled,
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) =>
      ok(await api.GET('/api/rooms/{id}/messages', { params: { path: { id: roomId }, query: { before: pageParam } } })),
    getNextPageParam: (page) => (page.hasMore ? page.messages[0]?.id : undefined),
    // Live events keep it fresh; refetching on focus would only reshuffle pages
    staleTime: Infinity,
  });

  useEffect(() => {
    if (!enabled) return;
    const socket = liveSocket();
    const watch = () => {
      void socket.emitWithAck('watch', roomId);
    };
    let connectedBefore = socket.connected;
    const onConnect = () => {
      watch();
      // Back after a drop: catch up on whatever was missed
      if (connectedBefore) void client.invalidateQueries({ queryKey: key });
      connectedBefore = true;
    };
    const onMessage = (m: ChatMessage) => {
      if (m.roomId !== roomId) return;
      client.setQueryData<Pages>(key, (d) => patch(d, { upsert: m }));
      setTyping((t) => (t && t.name === m.author.name ? null : t));
    };
    const onDeleted = (e: { roomId: string; id: string }) => {
      if (e.roomId === roomId) client.setQueryData<Pages>(key, (d) => patch(d, { remove: e.id }));
    };
    const onPictureFailed = (e: { roomId: string }) => {
      if (e.roomId === roomId) toast.error('A picture couldn’t be sent, so it was left out. Try another?');
    };
    const onTyping = (e: { roomId: string; person: { name: string } }) => {
      if (e.roomId === roomId) setTyping({ name: e.person.name, until: Date.now() + TYPING_MS });
    };
    if (socket.connected) watch();
    socket.on('connect', onConnect);
    socket.on('message', onMessage);
    socket.on('message:deleted', onDeleted);
    socket.on('typing', onTyping);
    socket.on('picture:failed', onPictureFailed);
    return () => {
      socket.off('picture:failed', onPictureFailed);
      socket.emit('unwatch', roomId);
      socket.off('connect', onConnect);
      socket.off('message', onMessage);
      socket.off('message:deleted', onDeleted);
      socket.off('typing', onTyping);
    };
    // key is derived from roomId
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, enabled, client]);

  // The typing line fades out when the signals stop
  useEffect(() => {
    if (!typing) return;
    const t = setTimeout(() => setTyping(null), Math.max(0, typing.until - Date.now()));
    return () => clearTimeout(t);
  }, [typing]);

  const send = useMutation({
    mutationFn: async ({ files = [], ...body }: { text: string; replyToId?: string; files?: File[] }) => {
      // Pictures go up first, then the message points at them (it shows once they're ready)
      const pictureIds = await Promise.all(files.map(uploadPicture));
      return ok(await api.POST('/api/rooms/{id}/messages', { params: { path: { id: roomId } }, body: { ...body, pictureIds } }));
    },
    onSuccess: (m) => client.setQueryData<Pages>(key, (d) => patch(d, { upsert: m })),
    onError: (error) => toast.error(problem(error, 'Couldn’t send that. Try again?')),
  });

  const edit = useMutation({
    mutationFn: async ({ id, text }: { id: string; text: string }) =>
      ok(await api.PATCH('/api/messages/{messageId}', { params: { path: { messageId: id } }, body: { text } })),
    onSuccess: (m) => client.setQueryData<Pages>(key, (d) => patch(d, { upsert: m })),
    onError: (error) => toast.error(problem(error)),
  });

  const react = useMutation({
    mutationFn: async ({ id, emoji, on }: { id: string; emoji: string; on: boolean }) =>
      on
        ? ok(await api.PUT('/api/messages/{messageId}/reactions', { params: { path: { messageId: id } }, body: { emoji } }))
        : ok(await api.DELETE('/api/messages/{messageId}/reactions', { params: { path: { messageId: id } }, body: { emoji } })),
    onSuccess: (m) => client.setQueryData<Pages>(key, (d) => patch(d, { upsert: m })),
    onError: (error) => toast.error(problem(error)),
  });

  /**
   * Deleting waits for the Undo toast to go: the message hides at once, and only leaves the room if
   * you don't take it back.
   */
  const remove = useCallback(
    (m: ChatMessage, label: string) => {
      const before = client.getQueryData<Pages>(key);
      client.setQueryData<Pages>(key, (d) => patch(d, { remove: m.id }));
      let undone = false;
      const commit = () => {
        if (undone) return;
        api
          .DELETE('/api/messages/{messageId}', { params: { path: { messageId: m.id } } })
          .then((res) => {
            if (!res.response.ok) throw res.error;
          })
          .catch((error) => {
            client.setQueryData(key, before);
            toast.error(problem(error, 'Couldn’t delete that.'));
          });
      };
      toast(label, {
        action: {
          label: 'Undo',
          onClick: () => {
            undone = true;
            client.setQueryData<Pages>(key, (d) => patch(d, { upsert: m }));
          },
        },
        onAutoClose: commit,
        onDismiss: commit,
      });
    },
    // key is derived from roomId
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [client, roomId],
  );

  // "Read" is sent at most every couple of seconds, and Home's unread counts refresh after
  const lastRead = useRef<string | null>(null);
  const markRead = useCallback(
    (messageId: string) => {
      if (messageId.startsWith('pending') || (lastRead.current && lastRead.current >= messageId)) return;
      lastRead.current = messageId;
      void api.PUT('/api/rooms/{id}/read', { params: { path: { id: roomId } }, body: { messageId } }).then(() => {
        void client.invalidateQueries({ queryKey: [...ROOMS_KEY, 'mine'] });
      });
    },
    [client, roomId],
  );

  const lastTyping = useRef(0);
  const sendTyping = useCallback(() => {
    if (Date.now() - lastTyping.current < TYPING_MS / 2) return;
    lastTyping.current = Date.now();
    liveSocket().emit('typing', roomId);
  }, [roomId]);

  return {
    query,
    messages: allMessages(query.data),
    // From the first page loaded: where you were when you opened the chat
    lastReadId: query.data?.pages[0]?.lastReadId ?? null,
    typing: typing?.name ?? null,
    send,
    edit,
    react,
    remove,
    markRead,
    sendTyping,
  };
}

/**
 * Uploads one picture straight to storage through a short-lived link, then tells the API it's
 * there so the worker can shrink and check it.
 */
async function uploadPicture(file: File): Promise<string> {
  const start = ok(await api.POST('/api/pictures', { body: { contentType: file.type, bytes: file.size } }));
  const put = await fetch(start.uploadUrl, { method: 'PUT', headers: start.headers, body: file });
  if (!put.ok) throw new Error('Couldn’t upload that picture. Try again?');
  ok(await api.POST('/api/pictures/{pictureId}/uploaded', { params: { path: { pictureId: start.id } } }));
  return start.id;
}
