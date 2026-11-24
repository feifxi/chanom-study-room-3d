import { describe, expect, it } from 'vitest';
import { BOARD_ADD_MAX } from '@connecta/shared';
import { BOARD_BUDGET_MAX, BOARD_CLEAR_COST, boardCost, spendBoard } from './rules.js';

describe('the whiteboard’s rate limit', () => {
  it('lets a fast pen draw all day', () => {
    const bucket = { boardLeft: BOARD_BUDGET_MAX, boardAt: 0 };
    // 240 one-point messages a second for a minute
    for (let i = 0; i < 240 * 60; i++) expect(spendBoard(bucket, boardCost(2), (i * 1000) / 240)).toBe(true);
  });

  it('cuts a flood of full messages to a trickle, and refills with time', () => {
    const bucket = { boardLeft: BOARD_BUDGET_MAX, boardAt: 0 };
    let passed = 0;
    for (let i = 0; i < 1000; i++) if (spendBoard(bucket, boardCost(BOARD_ADD_MAX), 0)) passed++;
    expect(passed).toBe(Math.floor(BOARD_BUDGET_MAX / boardCost(BOARD_ADD_MAX)));
    expect(spendBoard(bucket, BOARD_CLEAR_COST, 0)).toBe(false);
    expect(spendBoard(bucket, BOARD_CLEAR_COST, 1000)).toBe(true);
  });
});
