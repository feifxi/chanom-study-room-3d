import type { Schemas } from '@/lib/api/client';
import { UserAvatar } from './UserAvatar';

/** A Person in the avatar's shape (for AvatarStack). */
export const personAvatar = (p: Schemas['Person']) => ({
  id: p.id,
  name: p.name,
  color: p.look?.outfit ?? '#9c8aa0',
  presence: 'offline' as const,
});

/** Someone's face from their account (the colour is their outfit), with a presence dot when given one (friends). */
export function PersonFace({ who, size = 34, status }: { who: Schemas['Person']; size?: number; status?: Schemas['Presence']['status'] }) {
  return (
    <UserAvatar
      user={{ name: who.name, color: who.look?.outfit ?? '#9c8aa0', presence: status ?? 'offline' }}
      size={size}
      presence={!!status}
    />
  );
}
