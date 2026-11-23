import { notFound, redirect } from 'next/navigation';
import { commonType } from '@connecta/shared';
import { getMe } from '@/features/account/server';
import { CommonGuestGate } from '@/features/common/CommonGuestGate';
import { CommonWalkIn } from '@/features/common/CommonWalkIn';

/**
 * A Common room (feature 14): /common/library walks you into a copy the API picks (?with=<friend's
 * id> to join them). Anyone may come in: without a session you pick a name and walk in as a guest.
 */
export default async function CommonRoomPage({ params, searchParams }: PageProps<'/common/[type]'>) {
  const { type: typeId } = await params;
  const { with: withId } = await searchParams;
  const type = commonType(typeId);
  if (!type) notFound();
  const me = await getMe();
  if (!me || (me.isGuest && !me.name)) return <CommonGuestGate type={type} />;
  // An account halfway through signing up or deleting finishes that first
  if (!me.isGuest && (!me.signedUp || me.deleteAt)) redirect('/login');
  return <CommonWalkIn type={type} withId={typeof withId === 'string' ? withId : null} guestName={me.isGuest ? me.name : null} />;
}
