import { describe, it, expect } from 'vitest';
import { creditCost, creditLabel, deltaToFull, toggleStage } from './credits';

// These mirror the authoritative backend formula in storage/database.py:
//   null -> 5 ; len <= 3 -> 1 ; else max(2, len - 2)
describe('creditCost', () => {
  it('charges 5 for a full (null) analysis', () => {
    expect(creditCost(null)).toBe(5);
  });

  it('charges 1 for three or fewer stages (quick screen)', () => {
    expect(creditCost([1])).toBe(1);
    expect(creditCost([1, 2, 6])).toBe(1);
  });

  it('charges max(2, len-2) for larger custom selections', () => {
    expect(creditCost([1, 2, 3, 4])).toBe(2);
    expect(creditCost([1, 2, 3, 4, 5])).toBe(3);
    expect(creditCost([1, 2, 3, 4, 5, 6])).toBe(4);
    expect(creditCost([1, 2, 3, 4, 5, 6, 7, 8])).toBe(6);
  });
});

describe('creditLabel', () => {
  it('pluralizes correctly', () => {
    expect(creditLabel(null)).toBe('5 credits');
    expect(creditLabel([1, 2, 6])).toBe('1 credit');
    expect(creditLabel([1, 2, 3, 4])).toBe('2 credits');
  });
});

describe('deltaToFull', () => {
  it('is the extra cost to upgrade a partial run to the full 8 stages', () => {
    expect(deltaToFull(null)).toBe(0);
    expect(deltaToFull([1, 2, 6])).toBe(4); // 5 - 1
    expect(deltaToFull([1, 2, 3, 4, 5, 6])).toBe(1); // 5 - 4
  });
});

describe('toggleStage — custom selection dependency rules', () => {
  it('keeps stage 1 required (toggling it is a no-op)', () => {
    const next = toggleStage(new Set([1]), 1);
    expect(next.has(1)).toBe(true);
  });

  it('adds stage 6 automatically when 7 or 8 is selected', () => {
    expect(toggleStage(new Set([1]), 7).has(6)).toBe(true);
    expect(toggleStage(new Set([1]), 8).has(6)).toBe(true);
  });

  it('removes dependent 7 and 8 when 6 is deselected', () => {
    const next = toggleStage(new Set([1, 6, 7, 8]), 6);
    expect(next.has(6)).toBe(false);
    expect(next.has(7)).toBe(false);
    expect(next.has(8)).toBe(false);
  });

  it('toggles an ordinary stage on and off', () => {
    const on = toggleStage(new Set([1]), 3);
    expect(on.has(3)).toBe(true);
    const off = toggleStage(on, 3);
    expect(off.has(3)).toBe(false);
  });
});
