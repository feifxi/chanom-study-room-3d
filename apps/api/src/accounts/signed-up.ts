import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { User } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';

/**
 * A finished account: not a guest, not halfway through sign-up, not being deleted. Most of the app
 * (settings, rooms, friends) is only for these; anything else gets 403.
 */
export async function requireSignedUp(prisma: PrismaService, id: string): Promise<User> {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new NotFoundException();
  if (user.isAnonymous || !user.handle) throw new ForbiddenException('Finish signing up first');
  if (user.deleteAt) throw new ForbiddenException('This account is being deleted; keep it first');
  return user;
}
