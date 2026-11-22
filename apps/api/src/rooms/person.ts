import { sanitizeLook } from '@connecta/shared';
import type { User } from '../generated/prisma/client.js';
import type { Person } from './rooms.schemas.js';

/** Someone as other people see them: no email, no birthday. */
export function toPerson(user: Pick<User, 'id' | 'name' | 'handle' | 'look'>): Person {
  return { id: user.id, name: user.name, handle: user.handle, look: user.look ? sanitizeLook(user.look) : null };
}
