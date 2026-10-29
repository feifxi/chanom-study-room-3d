import type { FeedbackTag } from '@study/shared';

/** Rating 1–5 as faces (index 0 = 1). */
export const FACES = [
  { emoji: '😣', label: 'Not for me' },
  { emoji: '🙁', label: 'Meh' },
  { emoji: '😐', label: 'Okay' },
  { emoji: '🙂', label: 'Nice' },
  { emoji: '😍', label: 'Love it' },
] as const;

export const TAG_LABELS: Record<FeedbackTag, string> = { bug: '🐛 Found a bug', idea: '💡 Have an idea', love: '💖 Love it' };
