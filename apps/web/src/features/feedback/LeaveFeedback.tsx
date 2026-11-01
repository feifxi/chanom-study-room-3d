'use client';

import { useEffect, useState } from 'react';
import { FEEDBACK_COMMENT_MAX, FEEDBACK_TAGS, type FeedbackPayload, type FeedbackTag } from '@study/shared';
import { api } from '@/lib/api';
import { FACES, TAG_LABELS } from './faces';
import { markFeedbackSent, markFeedbackSkipped } from './askPolicy';

interface Props {
  /** Everything about the visit except what the person types. */
  context: Omit<FeedbackPayload, 'rating' | 'comment' | 'tags'>;
  /** Go back to the lobby (after sending or skipping). */
  onLeave: () => void;
  /** Changed their mind: stay in the room. */
  onStay: () => void;
}

/** "Before you go": a 1–5 face rating, optional tags and a comment. Skippable in one click. */
export function LeaveFeedback({ context, onLeave, onStay }: Props) {
  const [rating, setRating] = useState<number | null>(null);
  const [tags, setTags] = useState<FeedbackTag[]>([]);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onStay();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onStay]);

  const send = async () => {
    if (!rating) return;
    setSending(true);
    const body: FeedbackPayload = { ...context, rating, comment: comment.trim(), tags };
    try {
      const res = await api.feedback.$post({ json: body });
      if (res.ok) markFeedbackSent();
    } catch {
      // Feedback is a bonus: never trap someone in the room because it failed
    }
    onLeave();
  };

  const skip = () => {
    markFeedbackSkipped();
    onLeave();
  };

  const toggleTag = (t: FeedbackTag) => setTags((all) => (all.includes(t) ? all.filter((x) => x !== t) : [...all, t]));

  return (
    <div className="absolute inset-0 z-40 grid place-items-center bg-cocoa/30 p-4" onClick={onStay}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-title"
        className="panel flex w-[min(420px,100%)] flex-col gap-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h2 id="feedback-title" className="text-lg font-extrabold">
            Before you go, how was it?
          </h2>
          <p className="text-sm text-muted">
            It helps make the room cosier ✨ No account needed: we keep your rating, comment and nickname, plus how long you stayed and your
            browser.
          </p>
        </div>

        <div role="radiogroup" aria-label="Rating" className="flex justify-between gap-1">
          {FACES.map((f, i) => (
            <button
              key={f.label}
              role="radio"
              aria-checked={rating === i + 1}
              aria-label={f.label}
              title={f.label}
              onClick={() => setRating(i + 1)}
              className={`flex flex-1 flex-col items-center gap-1 rounded-2xl border py-2 text-[11px] font-bold ${
                rating === i + 1 ? 'border-accent bg-accent-soft text-accent-ink' : 'border-transparent text-muted hover:bg-soft'
              }`}
            >
              <span className={`text-3xl transition-transform ${rating === i + 1 ? 'scale-115' : ''}`}>{f.emoji}</span>
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {FEEDBACK_TAGS.map((t) => (
            <button
              key={t}
              onClick={() => toggleTag(t)}
              aria-pressed={tags.includes(t)}
              className={`rounded-full border px-3 py-1 text-xs font-bold ${tags.includes(t) ? 'border-accent bg-accent-soft text-accent-ink' : 'border-line bg-white'}`}
            >
              {TAG_LABELS[t]}
            </button>
          ))}
        </div>

        <label className="flex flex-col gap-1 text-xs font-bold text-muted">
          What did you like, or what bugged you? (optional)
          <textarea
            value={comment}
            maxLength={FEEDBACK_COMMENT_MAX}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            className="resize-none rounded-xl border border-line bg-white px-3 py-2 text-sm font-medium text-ink outline-none focus:border-accent"
          />
        </label>

        <div className="flex items-center gap-2">
          <button onClick={onStay} className="mr-auto text-sm font-bold text-muted hover:text-ink">
            Stay
          </button>
          <button onClick={skip} className="rounded-xl border border-line bg-white px-4 py-2 text-sm font-bold">
            Skip
          </button>
          <button
            onClick={send}
            disabled={!rating || sending}
            className="rounded-xl bg-accent px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
          >
            {sending ? 'Sending…' : 'Send & leave'}
          </button>
        </div>
      </section>
    </div>
  );
}
