import { Injectable } from '@nestjs/common';
import { handleProblem, handleSuggestions } from '@connecta/shared';
import { hasBlockedWord } from '@connecta/shared/moderate';
import { PrismaService } from '../prisma/prisma.service.js';
import type { HandleCheck } from './accounts.schemas.js';

@Injectable()
export class HandlesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Whether `handle` is free for `userId`. Their own current handle, and one held for them after a
   * change, count as free; one held for someone else counts as taken.
   */
  async check(handle: string, userId: string, now = new Date()): Promise<HandleCheck> {
    const problem = handleProblem(handle) ?? (hasBlockedWord(handle) ? 'That handle has a word we don’t allow' : null);
    if (problem) return { handle, available: false, reason: problem, suggestions: [] };
    if (await this.isFree(handle, userId, now)) return { handle, available: true, reason: null, suggestions: [] };
    const suggestions: string[] = [];
    for (const candidate of handleSuggestions(handle, now.getFullYear())) {
      if (suggestions.length === 3) break;
      if (await this.isFree(candidate, userId, now)) suggestions.push(candidate);
    }
    return { handle, available: false, reason: `@${handle} is taken`, suggestions };
  }

  private async isFree(handle: string, userId: string, now: Date): Promise<boolean> {
    const [owner, hold] = await Promise.all([
      this.prisma.user.findUnique({ where: { handle }, select: { id: true } }),
      this.prisma.handleHold.findUnique({ where: { handle } }),
    ]);
    if (owner && owner.id !== userId) return false;
    if (hold && hold.until > now && hold.userId !== userId) return false;
    return true;
  }
}
