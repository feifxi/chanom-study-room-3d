/** Reports (docs/features/12-moderation.md): what you can say about a person or a message, and about a room. */
export const PERSON_REASONS = [
  { id: 'harass', label: 'Harassment or bullying' },
  { id: 'hate', label: 'Hate or discrimination' },
  { id: 'sexual', label: 'Sexual content' },
  { id: 'spam', label: 'Spam or scams' },
  { id: 'name', label: 'Offensive name or avatar' },
  { id: 'other', label: 'Something else' },
] as const;

export const ROOM_REASONS = [
  { id: 'room_name', label: 'Its name or picture' },
  { id: 'room_about', label: 'Its description or rules' },
  { id: 'room_inside', label: 'What goes on inside' },
  { id: 'room_spam', label: 'Spam or a scam' },
  { id: 'room_danger', label: 'Someone may be in danger' },
  { id: 'room_other', label: 'Something else' },
] as const;

export type PersonReason = (typeof PERSON_REASONS)[number]['id'];
export type RoomReason = (typeof ROOM_REASONS)[number]['id'];
export const REPORT_REASON_IDS = [...PERSON_REASONS.map((r) => r.id), ...ROOM_REASONS.map((r) => r.id)] as [
  PersonReason | RoomReason,
  ...(PersonReason | RoomReason)[],
];

export const REPORT_DETAILS_MAX = 500;

/**
 * The automatic steps: enough reports from different accounts in a window, and the person is muted
 * in that room (rooms with mods) or out of Common rooms for a while. Guests' reports are kept for the
 * team but don't count (a guest is free to make).
 */
export const REPORT_STEPS = {
  room: { reports: 3, windowMinutes: 10, minutes: 15 },
  common: { reports: 5, windowMinutes: 30, minutes: 60 },
} as const;
