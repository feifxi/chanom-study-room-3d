'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMe, useSignOut } from '@/features/account/useMe';
import { liveSocket } from '@/features/chat/live';

/**
 * Suspended or banned by the Connecta team (admin site): the API ended every session, and each open
 * tab hears it here and goes to sign-in, which says until when and why.
 */
export function AccountListener() {
  const { data: me } = useMe();
  const on = !!me;
  const signOut = useSignOut();
  const router = useRouter();
  useEffect(() => {
    if (!on) return;
    const socket = liveSocket();
    // Forget the cached account, then sign-in (which says until when and why if they try again)
    const out = () => void signOut().then(() => router.push('/login'));
    socket.on('account', out);
    return () => {
      socket.off('account', out);
    };
  }, [on, signOut, router]);
  return null;
}
