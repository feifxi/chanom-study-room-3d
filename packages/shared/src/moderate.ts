import { asteriskCensorStrategy, englishDataset, englishRecommendedTransformers, RegExpMatcher, TextCensor } from 'obscenity';

/**
 * The word filter (feature 14, the first `moderate()` layer): English from `obscenity` (it catches
 * "sh1t" and "f.u.c.k" and leaves "Scunthorpe" alone), plus our own list with Thai. Thai is written
 * without spaces, so Thai words match inside text; the list keeps only words that can't be part of an
 * ordinary word (หี, for one, is in หีบ, a box). Our list lives in the database and the team edits it
 * on the admin site; each process gets it through {@link setWordFilter} (the API from the database,
 * the game server from Redis). Until then only the English list applies.
 */
/** Ordinary words that contain a listed one: left alone */
const THAI_EXCEPT = ['เหี้ยม'];

const english = new RegExpMatcher({ ...englishDataset.build(), ...englishRecommendedTransformers });
const censor = new TextCensor().setStrategy(asteriskCensorStrategy());
let on = true;
let own: RegExp | null = null;

/** Our own words and whether the filter runs at all (the admin site's Moderation page) */
export function setWordFilter(filter: { on: boolean; words: readonly string[] }) {
  on = filter.on;
  const words = filter.words.map((w) => w.trim()).filter(Boolean);
  own = words.length ? new RegExp(words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'gi') : null;
}
const except = new RegExp(THAI_EXCEPT.join('|'), 'g');

/** Where our own words are, minus the ordinary words that contain them */
function ownMatches(text: string): [number, number][] {
  if (!own) return [];
  const safe: [number, number][] = [...text.matchAll(except)].map((m) => [m.index, m.index + m[0].length]);
  return [...text.matchAll(own)]
    .map((m): [number, number] => [m.index, m.index + m[0].length])
    .filter(([a, b]) => !safe.some(([s, e]) => a >= s && b <= e));
}

/** The text with blocked words as asterisks (messages and bubbles: the meaning usually survives) */
export function maskWords(text: string): string {
  if (!on) return text;
  let out = censor.applyTo(text, english.getAllMatches(text));
  for (const [a, b] of ownMatches(out)) out = out.slice(0, a) + '*'.repeat(b - a) + out.slice(b);
  return out;
}

/** Whether the text has a blocked word (names and room names are refused instead of masked) */
export const hasBlockedWord = (text: string) => on && (english.hasMatch(text) || ownMatches(text).length > 0);
