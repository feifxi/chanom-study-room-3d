import { describe, expect, it } from 'vitest';
import { addDays, dayIn, focusActivity, isTimeZone, startOfDayIn, startOfWeekIn } from './focus.js';

describe('focus days', () => {
  it('knows real time zones only', () => {
    expect(isTimeZone('Asia/Bangkok')).toBe(true);
    expect(isTimeZone('Mars/Olympus')).toBe(false);
  });

  it('puts an instant on the right day in each zone', () => {
    const at = Date.parse('2026-11-23T20:00:00Z');
    expect(dayIn('UTC', at)).toBe('2026-11-23');
    expect(dayIn('Asia/Bangkok', at)).toBe('2026-11-24');
    expect(dayIn('America/Los_Angeles', at)).toBe('2026-11-23');
  });

  it('finds local midnight, across summer time too', () => {
    expect(startOfDayIn('Asia/Bangkok', Date.parse('2026-11-23T20:00:00Z')).toISOString()).toBe('2026-11-23T17:00:00.000Z');
    expect(startOfDayIn('UTC', Date.parse('2026-11-23T20:00:00Z')).toISOString()).toBe('2026-11-23T00:00:00.000Z');
    // Los Angeles: PDT (UTC-7) until 1 Nov 2026, PST (UTC-8) after
    expect(startOfDayIn('America/Los_Angeles', Date.parse('2026-07-01T12:00:00Z')).toISOString()).toBe('2026-07-01T07:00:00.000Z');
    expect(startOfDayIn('America/Los_Angeles', Date.parse('2026-11-23T12:00:00Z')).toISOString()).toBe('2026-11-23T08:00:00.000Z');
  });

  it('starts weeks on Monday, in the zone', () => {
    // Sunday 2026-11-22 20:00 UTC is already Monday the 23rd in Bangkok
    const at = Date.parse('2026-11-22T20:00:00Z');
    expect(startOfWeekIn('UTC', at).toISOString()).toBe('2026-11-16T00:00:00.000Z');
    expect(startOfWeekIn('Asia/Bangkok', at).toISOString()).toBe('2026-11-22T17:00:00.000Z');
    expect(addDays('2026-11-01', -2)).toBe('2026-10-30');
  });

  it('says what you focus on to friends', () => {
    expect(focusActivity('Calculus')).toBe('Focusing · Calculus');
    expect(focusActivity('')).toBe('Focusing');
  });
});
