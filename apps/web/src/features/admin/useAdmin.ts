'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type Schemas } from '@/lib/api/client';

export type AdminAccount = Schemas['AdminAccount'];
export type AdminAccountDetail = Schemas['AdminAccountDetail'];
export type AccountFilter = 'all' | 'reported' | 'restricted' | 'under18' | 'plus';
export type AccountActionKind = Schemas['AccountActionBody']['kind'];
export type ReportCase = Schemas['ReportCase'];
export type ReportAction = Schemas['ReportDecideBody']['action'];

const KEY = ['admin', 'users'] as const;

/** Throws the API's error body (so `problem` can read it), or returns the data */
function ok<T>(res: { data?: T; error?: unknown; response: Response }): T {
  if (res.error !== undefined || !res.response.ok) throw res.error ?? new Error(`${res.response.status}`);
  return res.data as T;
}

/** Accounts for the admin site's Users page (feature 14) */
export function useAdminAccounts(q: string, filter: AccountFilter) {
  return useQuery({
    queryKey: [...KEY, q, filter],
    queryFn: async () => ok(await api.GET('/api/admin/users', { params: { query: { q: q || undefined, filter } } })),
    placeholderData: (previous) => previous,
  });
}

export function useAdminAccount(id: string | null) {
  return useQuery({
    queryKey: [...KEY, 'one', id],
    queryFn: async () => ok(await api.GET('/api/admin/users/{id}', { params: { path: { id: id! } } })),
    enabled: !!id,
  });
}

/** Warn, suspend, ban, lift, reset name: emailed with the reason, in the audit log */
export function useAccountAction() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (v: { id: string; kind: AccountActionKind; reason: string }) =>
      ok(await api.POST('/api/admin/users/{id}/actions', { params: { path: { id: v.id } }, body: { kind: v.kind, reason: v.reason } })),
    onSuccess: (detail) => {
      client.setQueryData([...KEY, 'one', detail.id], detail);
      void client.invalidateQueries({ queryKey: KEY });
    },
  });
}

const REPORTS_KEY = ['admin', 'reports'] as const;

/** The reports queue: open cases (urgent first) or done ones; `open` is the badge's count */
export function useReportCases(status: 'open' | 'done' = 'open') {
  return useQuery({
    queryKey: [...REPORTS_KEY, status],
    queryFn: async () => ok(await api.GET('/api/admin/reports', { params: { query: { status } } })),
    // New reports arrive without a live event: look again now and then
    refetchInterval: 60_000,
  });
}

/** Decide a case: acts (emailing the person if it's an account action) and closes every report in it */
export function useDecideReport() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (v: { key: string; action: ReportAction; reason?: string }) => {
      const res = await api.POST('/api/admin/reports/{key}/decide', {
        params: { path: { key: v.key } },
        body: { action: v.action, reason: v.reason || undefined },
      });
      if (res.error !== undefined || !res.response.ok) throw res.error ?? new Error(`${res.response.status}`);
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: REPORTS_KEY });
      void client.invalidateQueries({ queryKey: KEY });
    },
  });
}

// ── Rooms, Common rooms, Moderation (part 3) ─────────────────────────────────────────────────

export type AdminRoom = Schemas['AdminRoom'];
export type RoomFilter = 'all' | 'listed' | 'reported' | 'closed';
export type RoomActionKind = Schemas['RoomActionBody']['kind'];
export type AdminCommon = Schemas['AdminCommon'];
export type Moderation = Schemas['Moderation'];

const ROOMS_KEY = ['admin', 'rooms'] as const;

export function useAdminRooms(q: string, filter: RoomFilter) {
  return useQuery({
    queryKey: [...ROOMS_KEY, q, filter],
    queryFn: async () => ok(await api.GET('/api/admin/rooms', { params: { query: { q: q || undefined, filter } } })),
    placeholderData: (previous) => previous,
  });
}

/** Delist, relist, close, reopen: the owner is emailed the reason */
export function useRoomAction() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (v: { id: string; kind: RoomActionKind; reason: string }) =>
      ok(await api.POST('/api/admin/rooms/{id}/actions', { params: { path: { id: v.id } }, body: { kind: v.kind, reason: v.reason } })),
    onSuccess: () => void client.invalidateQueries({ queryKey: ROOMS_KEY }),
  });
}

const COMMON_KEY = ['admin', 'common'] as const;

export function useAdminCommon() {
  return useQuery({
    queryKey: COMMON_KEY,
    queryFn: async () => ok(await api.GET('/api/admin/common')),
    // Copies open and close as people come and go
    refetchInterval: 15_000,
  });
}

export function useCommonSeats() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (body: { capacity: number; friendSeats: number }) => ok(await api.PUT('/api/admin/common/seats', { body })),
    onSuccess: (data) => client.setQueryData(COMMON_KEY, data),
  });
}

export function useCommonNotice() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (text: string) => ok(await api.POST('/api/admin/common/notice', { body: { text } })),
    onSuccess: (data) => client.setQueryData(COMMON_KEY, data),
  });
}

const MODERATION_KEY = ['admin', 'moderation'] as const;

export function useModeration() {
  return useQuery({ queryKey: MODERATION_KEY, queryFn: async () => ok(await api.GET('/api/admin/moderation')) });
}

export function useModerationChange() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (
      v: { switches: { wordFilter?: boolean; reportSteps?: boolean; pictureCheck?: boolean } } | { add: string } | { remove: string },
    ) =>
      'switches' in v
        ? ok(await api.PATCH('/api/admin/moderation', { body: v.switches }))
        : 'add' in v
          ? ok(await api.POST('/api/admin/moderation/words', { body: { word: v.add } }))
          : ok(await api.DELETE('/api/admin/moderation/words/{word}', { params: { path: { word: v.remove } } })),
    onSuccess: (data) => client.setQueryData(MODERATION_KEY, data),
  });
}
