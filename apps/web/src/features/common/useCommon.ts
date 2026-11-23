'use client';

import { useQuery } from '@tanstack/react-query';
import { api, type Schemas } from '@/lib/api/client';

export type CommonRoom = Schemas['CommonRoom'];
export const COMMON_KEY = ['common'] as const;

/** The Common room types with how many are inside now and which friends (feature 14) */
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
