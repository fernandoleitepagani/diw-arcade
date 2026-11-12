import { describe, expect, it } from 'vitest';

import { computeStreak, isoWeekKey, longestStreak } from './index';

const days = (...keys: string[]) => new Set(keys);

describe('computeStreak', () => {
  it('counts a three-day chain ending today', () => {
    expect(computeStreak(days('2026-11-10', '2026-11-11', '2026-11-12'), '2026-11-12')).toBe(3);
  });

  it('counts yesterday when today is still inactive', () => {
    expect(computeStreak(days('2026-11-10', '2026-11-11'), '2026-11-12')).toBe(2);
    expect(computeStreak(days('2026-11-11'), '2026-11-12')).toBe(1);
  });

  it('bridges a single missed day', () => {
    expect(computeStreak(days('2026-11-10', '2026-11-12'), '2026-11-12')).toBe(2);
  });

  it('breaks the streak on a second missed day in the same ISO week', () => {
    expect(computeStreak(days('2026-11-09', '2026-11-11', '2026-11-13'), '2026-11-13')).toBe(2);
  });

  it('bridges one missed day in each of two different ISO weeks', () => {
    const active = days(
      '2026-11-02',
      '2026-11-04',
      '2026-11-05',
      '2026-11-06',
      '2026-11-07',
      '2026-11-08',
      '2026-11-09',
      '2026-11-11',
      '2026-11-12',
      '2026-11-13',
    );

    expect(computeStreak(active, '2026-11-13')).toBe(10);
  });

  it('returns 0 for an empty history', () => {
    expect(computeStreak(days(), '2026-11-12')).toBe(0);
  });

  it('accepts a Date as today', () => {
    expect(computeStreak(days('2026-11-10', '2026-11-11', '2026-11-12'), new Date(2026, 10, 12))).toBe(3);
  });

  it('bridges a miss inside an ISO week that starts in the previous year', () => {
    expect(
      computeStreak(days('2025-12-29', '2025-12-30', '2026-01-01'), '2026-01-01'),
    ).toBe(3);
  });
});

describe('longestStreak', () => {
  it('returns the longest historical run, bridging one miss per ISO week', () => {
    const active = days(
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
      '2026-10-05',
      '2026-10-06',
      '2026-10-07',
      '2026-10-20',
      '2026-10-21',
    );

    expect(longestStreak(active)).toBe(6);
  });

  it('returns 0 for an empty history', () => {
    expect(longestStreak(days())).toBe(0);
  });
});

describe('isoWeekKey', () => {
  it('handles ISO weeks across a year boundary', () => {
    expect(isoWeekKey('2024-12-30')).toBe('2025-W01');
    expect(isoWeekKey('2025-01-01')).toBe('2025-W01');
    expect(isoWeekKey('2025-12-29')).toBe('2026-W01');
    expect(isoWeekKey('2026-01-01')).toBe('2026-W01');
    expect(isoWeekKey('2025-12-31')).toBe('2026-W01');
    expect(isoWeekKey('2027-01-01')).toBe('2026-W53');
    expect(isoWeekKey(new Date(2024, 11, 30))).toBe('2025-W01');
  });
});
