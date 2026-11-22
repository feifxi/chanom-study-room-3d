/** Account rules shared by the sign-up page (live checks) and the API (the final say). */

export const MIN_AGE = 13;
export const DISPLAY_NAME_MAX = 16;
/** A handle can be changed once in this many days */
export const HANDLE_CHANGE_DAYS = 30;
/** An old handle stays held for its owner this long (after a change or after deleting the account) */
export const HANDLE_HOLD_DAYS = 30;
/** Days between asking to delete an account and it going; signing in offers to keep it */
export const DELETE_GRACE_DAYS = 7;

/** Handles: 3–20 of a–z, 0–9, "." and "_", not starting or ending with "." */
export const HANDLE_RULE = /^[a-z0-9_](?:[a-z0-9._]{1,18}[a-z0-9_])$/;

export const RESERVED_HANDLES: ReadonlySet<string> = new Set(['admin', 'connecta', 'support', 'mod', 'staff', 'help', 'guest']);

/** A handle guess from a display name: "Mochi Bun!" → "mochibun". Thai or emoji names give "". */
export function handleFrom(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9._]/g, '')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 20);
}

/** Why a handle can't be used, before asking whether someone has it; null when its shape is fine. */
export function handleProblem(handle: string): string | null {
  if (handle.length < 3) return 'At least 3 characters';
  if (handle.length > 20) return 'At most 20 characters';
  if (!HANDLE_RULE.test(handle)) return 'Use a–z, 0–9, "." or "_" (no dot at the start or end)';
  if (RESERVED_HANDLES.has(handle)) return `@${handle} is reserved`;
  return null;
}

/** Other handles to offer when one is taken: maimai → maimai_, maimai.26, its.maimai, maimai123. */
export function handleSuggestions(handle: string, year: number): string[] {
  const base = handle.slice(0, 16);
  return [`${base}_`, `${base}.${year % 100}`, `its.${base}`, `${base}123`].filter((s) => handleProblem(s) === null);
}

/** Whole years old on a date. The birthday is a calendar date (YYYY-MM-DD), so no time zones. */
export function ageOn(birthday: string, today: string): number {
  const [by, bm, bd] = birthday.split('-').map(Number) as [number, number, number];
  const [ty, tm, td] = today.split('-').map(Number) as [number, number, number];
  return ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0);
}
