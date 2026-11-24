'use client';

import { useQuery } from '@tanstack/react-query';
import type { Timeout } from '@connecta/shared';
import { api, type Schemas } from '@/lib/api/client';

export type CommonRoom = Schemas['CommonRoom'];
export const COMMON_KEY = ['common'] as const;

/** The Common room types with how many are inside now and which friends (docs/features/13-common-rooms.md) */
export function useCommonRooms() {
  return useQuery({
    queryKey: COMMON_KEY,
    queryFn: async () => {
      const { data, response } = await api.GET('/api/common');
      if (!data) throw new Error(`${response.status}`);
      return data;
    },
    refetchInterval: 30_000,
  });
}

/** Where a friend in a Common copy is joined from (Home, Friends) */
export const joinCommonHref = (type: string, friendId: string) => `/common/${type}?with=${encodeURIComponent(friendId)}`;

/** The Connecta team's actions in Common rooms (docs/features/13-common-rooms.md); they throw the API's error body */
export const commonApi = {
  timeOut: async (userId: string, duration: Timeout) => {
    const { error, response } = await api.PUT('/api/common/people/{userId}/timeout', { params: { path: { userId } }, body: { duration } });
    if (!response.ok) throw error ?? new Error(`${response.status}`);
  },
  remove: async (userId: string) => {
    const { error, response } = await api.POST('/api/common/people/{userId}/remove', { params: { path: { userId } } });
    if (!response.ok) throw error ?? new Error(`${response.status}`);
  },
};
