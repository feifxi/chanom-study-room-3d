import type { FeedbackRow } from '@study/shared';

const CSV_COLUMNS: (keyof FeedbackRow)[] = [
  'createdAt',
  'rating',
  'tags',
  'comment',
  'name',
  'roomLabel',
  'minutesInRoom',
  'usedVoice',
  'viewport',
  'userAgent',
  'visitorId',
];

export function feedbackCsv(rows: FeedbackRow[]) {
  const cell = (v: unknown) => {
    const s = Array.isArray(v) ? v.join(' ') : String(v ?? '');
    // Quote everything; neutralise spreadsheet formulas
    return `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
  };
  return [CSV_COLUMNS.join(','), ...rows.map((r) => CSV_COLUMNS.map((c) => cell(r[c])).join(','))].join('\n');
}
