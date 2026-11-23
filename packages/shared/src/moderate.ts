import { asteriskCensorStrategy, englishDataset, englishRecommendedTransformers, RegExpMatcher, TextCensor } from 'obscenity';

/**
 * The word filter (feature 14, the first `moderate()` layer): English from `obscenity` (it catches
 * "sh1t" and "f.u.c.k" and leaves "Scunthorpe" alone), plus our own list with Thai. Thai is written
 * without spaces, so Thai words match inside text; the list keeps only words that can't be part of an
 * ordinary word (หี, for one, is in หีบ, a box). The admin site will edit our list.
 */
export const OWN_WORDS: readonly string[] = [
  'เหี้ย',
  'ควย',
  'เย็ด',
  'สัส',
  'ระยำ',
  'ส้นตีน',
  'ชาติหมา',
  'อีดอก',
  'อีตอแหล',
  'กะหรี่',
  'แตด',
];
/** Ordinary words that contain a listed one: left alone */
const THAI_EXCEPT = ['เหี้ยม'];

const english = new RegExpMatcher({ ...englishDataset.build(), ...englishRecommendedTransformers });
const censor = new TextCensor().setStrategy(asteriskCensorStrategy());
const own = new RegExp(OWN_WORDS.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'gi');
const except = new RegExp(THAI_EXCEPT.join('|'), 'g');

/** Where our own words are, minus the ordinary words that contain them */
function ownMatches(text: string): [number, number][] {
  const safe: [number, number][] = [...text.matchAll(except)].map((m) => [m.index, m.index + m[0].length]);
  return [...text.matchAll(own)]
    .map((m): [number, number] => [m.index, m.index + m[0].length])
    .filter(([a, b]) => !safe.some(([s, e]) => a >= s && b <= e));
}

/** The text with blocked words as asterisks (messages and bubbles: the meaning usually survives) */
export function maskWords(text: string): string {
  let out = censor.applyTo(text, english.getAllMatches(text));
  for (const [a, b] of ownMatches(out)) out = out.slice(0, a) + '*'.repeat(b - a) + out.slice(b);
  return out;
}

/** Whether the text has a blocked word (names and room names are refused instead of masked) */
export const hasBlockedWord = (text: string) => english.hasMatch(text) || ownMatches(text).length > 0;
