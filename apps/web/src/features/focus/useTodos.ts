'use client';

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { TODO_LIMIT, TODO_MAX } from '@connecta/shared';
import { api, type Schemas } from '@/lib/api/client';
import { problem } from '@/features/rooms/useRooms';
import { liveSocket } from '@/features/chat/live';

export type Todo = Schemas['Todo'];
const KEY = ['todos'] as const;
/** Marks an item just added, before the server gives it an id */
const PENDING = 'new-';

/** Throws the API's error body, or returns the data */
function ok<T>(res: { data?: T; error?: unknown; response: Response }): T {
  if (res.error !== undefined || !res.response.ok) throw res.error ?? new Error(`${res.response.status}`);
  return res.data as T;
}

/**
 * Your to-do list (docs/features/07-study-tools.md): private, the same in every room, on the API. Changes show at once
 * and roll back with a toast if the API says no. Off for guests (they have no list).
 */
export function useTodos(enabled = true) {
  const client = useQueryClient();
  const { data } = useQuery({
    queryKey: KEY,
    enabled,
    queryFn: async () => ok(await api.GET('/api/todos')).todos,
  });
  const todos = data ?? [];
  // A change in another tab or device: fetch the list again
  useEffect(() => {
    if (!enabled) return;
    const socket = liveSocket();
    const refresh = () => void client.invalidateQueries({ queryKey: KEY });
    socket.on('todos', refresh);
    return () => {
      socket.off('todos', refresh);
    };
  }, [enabled, client]);

  const add = useMutation(
    optimistic(
      client,
      (list, text: string) => [...list, { id: `${PENDING}${crypto.randomUUID()}`, text, done: false }],
      async (text: string) => ok(await api.POST('/api/todos', { body: { text } })),
    ),
  );
  const tick = useMutation(
    optimistic(
      client,
      (list, { id, done }: { id: string; done: boolean }) => list.map((t) => (t.id === id ? { ...t, done } : t)),
      async ({ id, done }: { id: string; done: boolean }) =>
        ok(await api.PATCH('/api/todos/{id}', { params: { path: { id } }, body: { done } })),
    ),
  );
  const remove = useMutation(
    optimistic(
      client,
      (list, id: string) => list.filter((t) => t.id !== id),
      async (id: string) => ok(await api.DELETE('/api/todos/{id}', { params: { path: { id } } })),
    ),
  );
  const clearDone = useMutation(
    optimistic(
      client,
      (list) => list.filter((t) => !t.done),
      async () => ok(await api.DELETE('/api/todos/done')),
    ),
  );

  return {
    todos,
    left: todos.filter((t) => !t.done).length,
    full: todos.length >= TODO_LIMIT,
    add: (text: string) => {
      const t = text.trim().slice(0, TODO_MAX);
      if (t && todos.length < TODO_LIMIT) add.mutate(t);
    },
    toggle: (id: string) => {
      const t = todos.find((x) => x.id === id);
      // A just-added item has no server id yet
      if (t && !id.startsWith(PENDING)) tick.mutate({ id, done: !t.done });
    },
    remove: (id: string) => {
      if (!id.startsWith(PENDING)) remove.mutate(id);
    },
    clearDone: () => clearDone.mutate(undefined),
  };
}

/** A change shown in the cached list at once; the server's answer (or a failure, with a toast) settles it */
function optimistic<A>(client: QueryClient, change: (list: Todo[], args: A) => Todo[], call: (args: A) => Promise<unknown>) {
  return {
    mutationFn: call,
    onMutate: async (args: A) => {
      await client.cancelQueries({ queryKey: KEY });
      const before = client.getQueryData<Todo[]>(KEY);
      client.setQueryData<Todo[]>(KEY, change(before ?? [], args));
      return { before };
    },
    onError: (error: unknown, _args: A, context: { before?: Todo[] } | undefined) => {
      client.setQueryData(KEY, context?.before);
      toast.error(problem(error));
    },
    onSettled: () => client.invalidateQueries({ queryKey: KEY }),
  };
}
