'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, type Schemas } from '@/lib/api/client';
import { useMe } from '@/features/account/useMe';
import { problem } from '@/features/rooms/useRooms';

export type Friend = Schemas['Friend'];
export type FriendRequests = Schemas['FriendRequests'];

/** Friends, requests and blocks all start with this, so one invalidate refreshes the page and the badge. */
export const FRIENDS_KEY = ['friends'] as const;

function ok<T>(res: { data?: T; error?: unknown; response: Response }): T {
  if (res.error !== undefined || !res.response.ok) throw res.error ?? new Error(`${res.response.status}`);
  return res.data as T;
}

/** Only finished accounts have friends; guests and half-signed-up people don't ask. */
function useHasFriends() {
  const { data: me } = useMe();
  return !!me && !me.isGuest && me.signedUp;
}

export function useFriends() {
  return useQuery({ queryKey: [...FRIENDS_KEY, 'list'], queryFn: async () => ok(await api.GET('/api/friends')), enabled: useHasFriends() });
}

export function useFriendRequests() {
  return useQuery({
    queryKey: [...FRIENDS_KEY, 'requests'],
    queryFn: async () => ok(await api.GET('/api/friends/requests')),
    enabled: useHasFriends(),
  });
}

export function useBlocks(enabled = true) {
  return useQuery({ queryKey: [...FRIENDS_KEY, 'blocks'], queryFn: async () => ok(await api.GET('/api/blocks')), enabled });
}

/**
 * A change to friends: refreshes everything about them and toasts the API's reason when it says no
 * (unless `quiet`: the Add friend box shows the reason under itself).
 */
export function useFriendAction<A, R>(call: (args: A) => Promise<R>, done?: (result: R, args: A) => void, quiet = false) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: call,
    onSuccess: (result, args) => {
      void client.invalidateQueries({ queryKey: FRIENDS_KEY });
      // Who you can message changes with it
      void client.invalidateQueries({ queryKey: ['dms'] });
      done?.(result, args);
    },
    onError: (error) => !quiet && toast.error(problem(error)),
  });
}

export const friendsApi = {
  /** Throws the API's answer (no_one, self, already_friends…) so the Add friend dialog can show it. */
  add: async (handle: string) => ok(await api.POST('/api/friends/requests', { body: { handle } })),
  accept: async (userId: string) => ok(await api.POST('/api/friends/requests/{userId}/accept', { params: { path: { userId } } })),
  ignore: async (userId: string) => ok(await api.POST('/api/friends/requests/{userId}/ignore', { params: { path: { userId } } })),
  cancel: async (userId: string) => ok(await api.DELETE('/api/friends/requests/{userId}', { params: { path: { userId } } })),
  remove: async (userId: string) => ok(await api.DELETE('/api/friends/{userId}', { params: { path: { userId } } })),
  block: async (userId: string) => ok(await api.PUT('/api/blocks/{userId}', { params: { path: { userId } } })),
  unblock: async (userId: string) => ok(await api.DELETE('/api/blocks/{userId}', { params: { path: { userId } } })),
};

/** Your friend link: opening it sends you a request. */
export const friendLink = (handle: string) => `${typeof window === 'undefined' ? '' : window.location.host}/f/${handle}`;
