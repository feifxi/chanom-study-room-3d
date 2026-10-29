import { describe, expect, it } from 'vitest';
import type { FeedbackRow } from '@study/shared';
import { feedbackCsv } from './routes';

const row = (over: Partial<FeedbackRow> = {}): FeedbackRow => ({
  id: 1,
  visitorId: 'visitor-123',
  name: 'Mint',
  rating: 5,
  comment: 'love it',
  tags: ['love'],
  roomLabel: 'Library #1',
  minutesInRoom: 12.5,
  usedVoice: true,
  viewport: '1440x900',
  userAgent: 'Chrome',
  createdAt: '2026-10-29T03:00:00.000Z',
  ...over,
});

describe('feedbackCsv', () => {
  it('writes a header and one quoted line per row', () => {
    const [header, line] = feedbackCsv([row()]).split('\n');
    expect(header).toMatch(/^createdAt,rating,tags,comment/);
    expect(line).toContain('"5","love","love it"');
  });

  it('escapes quotes and neutralises spreadsheet formulas', () => {
    const csv = feedbackCsv([row({ comment: 'say "hi"', name: '=HYPERLINK("x")' })]);
    expect(csv).toContain('"say ""hi"""');
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`);
  });
});
