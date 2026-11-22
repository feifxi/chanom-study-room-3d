'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, type Schemas } from '@/lib/api/client';

export type Room = Schemas['Room'];
export type ListedRoom = Schemas['ListedRoom'];
export type Member = Schemas['Member'];
export type Person = Schemas['Person'];
export type Invite = Schemas['Invite'];
export type JoinRequest = Schemas['JoinRequest'];
export type Ban = Schemas['Ban'];
export type RoomSettings = Schemas['RoomSettingsBody'];

/** Everything about rooms in the cache starts with this, so one invalidate refreshes Home, a room's page and its settings. */
export const ROOMS_KEY = ['rooms'] as const;

/** The API's reason when it says no ({ message } from Nest, or a plain string), for a toast. */
export function problem(error: unknown, fallback = 'That didn’t work. Try again?'): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const m = (error as { message: unknown }).message;
    if (typeof m === 'string' && m) return m;
    if (Array.isArray(m) && typeof m[0] === 'string') return m[0];
  }
  return fallback;
}

/** Throws the API's error body (so `problem` can read it), or returns the data. */
function ok<T>(res: { data?: T; error?: unknown; response: Response }): T {
  if (res.error !== undefined || !res.response.ok) throw res.error ?? new Error(`${res.response.status}`);
  return res.data as T;
}

/** Home: the rooms you're a member of. */
export function useMyRooms() {
  return useQuery({ queryKey: [...ROOMS_KEY, 'mine'], queryFn: async () => ok(await api.GET('/api/rooms')) });
}

/** One room; `initial` comes from the server render so the page doesn't wait. */
export function useRoom(id: string, initial?: Room, enabled = true) {
  return useQuery({
    queryKey: [...ROOMS_KEY, id],
    queryFn: async () => ok(await api.GET('/api/rooms/{id}', { params: { path: { id } } })),
    initialData: initial,
    enabled,
  });
}

export function useListedRooms(filter: { q?: string; tag?: string; language?: string } = {}) {
  return useQuery({
    queryKey: [...ROOMS_KEY, 'listed', filter],
    queryFn: async () => ok(await api.GET('/api/rooms/listed', { params: { query: filter as Schemas['DiscoverQuery'] } })),
  });
}

export function useMembers(id: string, enabled = true) {
  return useQuery({
    queryKey: [...ROOMS_KEY, id, 'members'],
    queryFn: async () => ok(await api.GET('/api/rooms/{id}/members', { params: { path: { id } } })),
    enabled,
  });
}

export function useRequests(id: string, enabled = true) {
  return useQuery({
    queryKey: [...ROOMS_KEY, id, 'requests'],
    queryFn: async () => ok(await api.GET('/api/rooms/{id}/requests', { params: { path: { id } } })),
    enabled,
  });
}

export function useBans(id: string, enabled = true) {
  return useQuery({
    queryKey: [...ROOMS_KEY, id, 'bans'],
    queryFn: async () => ok(await api.GET('/api/rooms/{id}/bans', { params: { path: { id } } })),
    enabled,
  });
}

export function useInvites(id: string, enabled = true) {
  return useQuery({
    queryKey: [...ROOMS_KEY, id, 'invites'],
    queryFn: async () => ok(await api.GET('/api/rooms/{id}/invites', { params: { path: { id } } })),
    enabled,
  });
}

/**
 * Every change to a room: runs the call, refreshes everything about rooms, and toasts the API's
 * reason when it says no. `done` gets the result (for a success toast or moving on).
 */
export function useRoomAction<A, R>(call: (args: A) => Promise<R>, done?: (result: R, args: A) => void) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: call,
    onSuccess: (result, args) => {
      void client.invalidateQueries({ queryKey: ROOMS_KEY });
      done?.(result, args);
    },
    onError: (error) => toast.error(problem(error)),
  });
}

/** The calls, so components don't repeat the paths. Each throws the API's error body when it says no. */
export const roomsApi = {
  make: async (body: Schemas['CreateRoomBody']) => ok(await api.POST('/api/rooms', { body })),
  update: async ({ id, ...body }: RoomSettings & { id: string }) =>
    ok(await api.PATCH('/api/rooms/{id}', { params: { path: { id } }, body })),
  remove: async ({ id, name }: { id: string; name: string }) =>
    ok(await api.DELETE('/api/rooms/{id}', { params: { path: { id } }, body: { name } })),
  transfer: async ({ id, userId }: { id: string; userId: string }) =>
    ok(await api.PUT('/api/rooms/{id}/owner', { params: { path: { id } }, body: { userId } })),
  myPlace: async ({ id, ...body }: Schemas['MyPlaceBody'] & { id: string }) =>
    ok(await api.PATCH('/api/rooms/{id}/me', { params: { path: { id } }, body })),
  visit: async (id: string) => ok(await api.PUT('/api/rooms/{id}/visit', { params: { path: { id } } })),
  join: async (id: string) => ok(await api.POST('/api/rooms/{id}/join', { params: { path: { id } } })),
  leave: async (id: string) => ok(await api.DELETE('/api/rooms/{id}/me', { params: { path: { id } } })),
  ask: async ({ id, note }: { id: string; note?: string }) =>
    ok(await api.POST('/api/rooms/{id}/requests', { params: { path: { id } }, body: { note } })),
  decide: async ({ id, userId, letIn }: { id: string; userId: string; letIn: boolean }) =>
    letIn
      ? ok(await api.POST('/api/rooms/{id}/requests/{userId}/accept', { params: { path: { id, userId } } }))
      : ok(await api.POST('/api/rooms/{id}/requests/{userId}/decline', { params: { path: { id, userId } } })),
  setRole: async ({ id, userId, role }: { id: string; userId: string; role: 'mod' | 'member' }) =>
    ok(await api.PUT('/api/rooms/{id}/members/{userId}/role', { params: { path: { id, userId } }, body: { role } })),
  timeOut: async ({ id, userId, duration }: { id: string; userId: string; duration: Schemas['TimeoutBody']['duration'] }) =>
    ok(await api.PUT('/api/rooms/{id}/members/{userId}/timeout', { params: { path: { id, userId } }, body: { duration } })),
  kick: async ({ id, userId }: { id: string; userId: string }) =>
    ok(await api.DELETE('/api/rooms/{id}/members/{userId}', { params: { path: { id, userId } } })),
  ban: async ({ id, userId, reason }: { id: string; userId: string; reason?: string }) =>
    ok(await api.PUT('/api/rooms/{id}/bans/{userId}', { params: { path: { id, userId } }, body: { reason } })),
  unban: async ({ id, userId }: { id: string; userId: string }) =>
    ok(await api.DELETE('/api/rooms/{id}/bans/{userId}', { params: { path: { id, userId } } })),
  makeInvite: async ({ id, ...body }: Schemas['MakeInviteBody'] & { id: string }) =>
    ok(await api.POST('/api/rooms/{id}/invites', { params: { path: { id } }, body })),
  cancelInvite: async (code: string) => ok(await api.DELETE('/api/invites/{code}', { params: { path: { code } } })),
  preview: async (code: string) => ok(await api.GET('/api/invites/{code}', { params: { path: { code } } })),
  accept: async (code: string) => ok(await api.POST('/api/invites/{code}/accept', { params: { path: { code } } })),
};

/** The full link for an invite: /i/<code> for members, /g/<code> for guest passes, on this site. */
export const inviteUrl = (invite: Pick<Invite, 'code' | 'kind'>) =>
  `${typeof window === 'undefined' ? '' : window.location.origin}/${invite.kind === 'guest' ? 'g' : 'i'}/${invite.code}`;
