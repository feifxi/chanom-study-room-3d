/** Feedback asked when someone leaves a room, and what the admin page shows. */

export const FEEDBACK_TAGS = ['bug', 'idea', 'love'] as const;
export type FeedbackTag = (typeof FEEDBACK_TAGS)[number];
export const FEEDBACK_COMMENT_MAX = 1000;

/** POST /feedback body (the server adds the user agent and timestamp). */
export interface FeedbackPayload {
  visitorId: string;
  name: string;
  /** 1 (didn't like it) … 5 (loved it) */
  rating: number;
  comment: string;
  tags: FeedbackTag[];
  roomLabel: string;
  minutesInRoom: number;
  usedVoice: boolean;
  /** e.g. "1440x900" */
  viewport: string;
}

export interface FeedbackRow extends FeedbackPayload {
  id: number;
  userAgent: string;
  /** ISO timestamp */
  createdAt: string;
}

export interface AdminSummary {
  visitors: { today: number; last7Days: number; allTime: number };
  visits: { last7Days: number; avgMinutes: number };
  focusMinutes: { last7Days: number; allTime: number };
  feedback: { count: number; avgRating: number | null; /** index 0 = rating 1 */ distribution: number[] };
  /** Unique visitors per Thai day, oldest first, 7 entries ending today. */
  daily: { date: string; visitors: number }[];
}

/**
 * GET /admin/overview: product analytics (feedback first, then usage).
 * Service health and performance live in Grafana, not here.
 */
export interface AdminOverview {
  live: {
    online: number;
    /** Highest number of people online at once since the server started. */
    peakOnline: number;
    rooms: { label: string; clients: number; maxClients: number; npcs: number }[];
  };
  /** null when the database is off */
  summary: AdminSummary | null;
  feedback: FeedbackRow[];
}
