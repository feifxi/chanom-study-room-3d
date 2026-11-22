import type { Schemas } from '@/lib/api/client';
import { UserAvatar } from './UserAvatar';

/** Someone's face from their account (the colour is their outfit). Presence comes with step 3. */
export function PersonFace({ who, size = 34 }: { who: Schemas['Person']; size?: number }) {
  return <UserAvatar user={{ name: who.name, color: who.look?.outfit ?? '#9c8aa0', presence: 'offline' }} size={size} />;
}
