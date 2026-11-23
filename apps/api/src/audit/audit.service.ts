import { Global, Injectable, Module } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

export interface AuditInput {
  /** The team member, or null for an automatic step */
  by: string | null;
  /** e.g. account.suspend, common.remove, report.step */
  action: string;
  targetKind: 'user' | 'room' | 'message' | 'report' | 'setting';
  targetId: string;
  reason?: string;
  details?: Record<string, unknown>;
}

/** The audit log (admin site): every team action and automatic step, append-only, kept a year. */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(e: AuditInput): Promise<void> {
    await this.prisma.auditEntry.create({
      data: {
        byId: e.by,
        action: e.action,
        targetKind: e.targetKind,
        targetId: e.targetId,
        reason: e.reason ?? '',
        details: e.details as Prisma.InputJsonValue | undefined,
      },
    });
  }
}

/** Global: any module that takes a team action or an automatic step writes to it. */
@Global()
@Module({ providers: [AuditService], exports: [AuditService] })
export class AuditModule {}
