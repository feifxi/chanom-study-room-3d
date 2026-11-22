'use client';

import { PersonFace } from '@/components/PersonFace';
import { useFriends } from '@/features/friends/useFriends';
import type { Schemas } from '@/lib/api/client';

/** Someone's face with their live presence dot if they're your friend (presence is for friends only). */
export function FriendFace({ who, size }: { who: Schemas['Person']; size?: number }) {
  const friends = useFriends();
  const status = friends.data?.find((f) => f.person.id === who.id)?.presence.status;
  return <PersonFace who={who} size={size} status={status} />;
}
