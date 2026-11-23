import { NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service.js';

/** The admin site is the Connecta team's: everyone else gets "not found", so it isn't advertised. */
export async function requireTeam(prisma: PrismaService, userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { team: true } });
  if (!user?.team) throw new NotFoundException();
}
