import { REPORT_DETAILS_MAX, REPORT_REASON_IDS } from '@connecta/shared';
import { z } from 'zod';

/**
 * A report (docs/features/13-common-rooms.md). A person: `userId`, and `place` when it happened in a room or a Common copy
 * (with the bubbles you saw them say, which nobody stores). A message: `messageId`. A room: `place`.
 */
export const ReportBodySchema = z
  .object({
    kind: z.enum(['person', 'message', 'room']),
    userId: z.string().max(64).optional(),
    messageId: z.string().max(64).optional(),
    place: z.string().max(64).optional(),
    reason: z.enum(REPORT_REASON_IDS),
    details: z.string().trim().max(REPORT_DETAILS_MAX).optional(),
    /** Also block them (accounts only) */
    block: z.boolean().optional(),
    bubbles: z.array(z.string().max(200)).max(10).optional(),
  })
  .meta({ id: 'ReportBody' });
export type ReportBody = z.infer<typeof ReportBodySchema>;

export const ReportSentSchema = z.object({ id: z.string() }).meta({ id: 'ReportSent' });
export type ReportSent = z.infer<typeof ReportSentSchema>;
