'use client';

import { toast } from 'sonner';
import { api } from '@/lib/api/client';
import { useMe, useSetMe } from './useMe';

/**
 * Settings → Notifications: "Hide game invites while I'm focusing", on the account so it follows you
 * to every device. Off by default: people in a room usually want in. Guests can't change it.
 */
export function useHideInvitesWhileFocusing() {
  const { data: me } = useMe();
  const setMe = useSetMe();
  const set = async (hideInvitesWhileFocusing: boolean) => {
    const { data } = await api.PATCH('/api/me/notifications', { body: { hideInvitesWhileFocusing } });
    if (!data) return void toast.error('Couldn’t save that. Try again?');
    setMe(data);
  };
  return [me?.hideInvitesWhileFocusing ?? false, set] as const;
}
