/** When to show the "before you go" card: until you've sent feedback once, at most once a day if you skip it. */
const SENT_KEY = 'chanom-study:feedback-sent';
const SKIPPED_KEY = 'chanom-study:feedback-skipped-at';
const ASK_AGAIN_AFTER_MS = 24 * 3_600_000;

function read(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage blocked: we'll just ask again next time
  }
}

export function shouldAskFeedback(now = Date.now()) {
  if (read(SENT_KEY)) return false;
  const skipped = Number(read(SKIPPED_KEY) ?? 0);
  return now - skipped > ASK_AGAIN_AFTER_MS;
}

export const markFeedbackSent = () => write(SENT_KEY, '1');
export const markFeedbackSkipped = (now = Date.now()) => write(SKIPPED_KEY, String(now));
