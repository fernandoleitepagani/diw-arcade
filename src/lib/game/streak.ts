import { addDays, isoWeekKey, toDayKey, type DayKey } from './days';

function normalizeToday(today: Date | DayKey): DayKey {
  return typeof today === 'string' ? today : toDayKey(today);
}

/**
 * Current streak ending today (or yesterday while today is still inactive).
 * A single missed day is bridged once per ISO week; a second miss in the same
 * week ends the streak. Bridged days do not count toward the streak length.
 */
export function computeStreak(activeDays: Iterable<DayKey>, today: Date | DayKey): number {
  const active = new Set(activeDays);
  const todayKey = normalizeToday(today);
  let cursor = active.has(todayKey) ? todayKey : addDays(todayKey, -1);
  const usedFreezes = new Set<string>();
  let streak = 0;

  for (;;) {
    if (active.has(cursor)) {
      streak += 1;
      cursor = addDays(cursor, -1);
      continue;
    }

    const previous = addDays(cursor, -1);
    const week = isoWeekKey(cursor);
    if (active.has(previous) && !usedFreezes.has(week)) {
      usedFreezes.add(week);
      cursor = previous;
      continue;
    }

    return streak;
  }
}

/** Longest historical streak, using the same one-freeze-per-ISO-week rule. */
export function longestStreak(activeDays: Iterable<DayKey>): number {
  const active = new Set(activeDays);
  if (active.size === 0) return 0;

  const sorted = [...active].sort();
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (first === undefined || last === undefined) return 0;

  let best = 0;
  let current = 0;
  let previousActive: DayKey | null = null;
  const usedFreezes = new Set<string>();

  for (let cursor = first; cursor <= last; cursor = addDays(cursor, 1)) {
    if (active.has(cursor)) {
      current += 1;
      previousActive = cursor;
      continue;
    }

    const isSingleGap =
      previousActive !== null &&
      addDays(previousActive, 1) === cursor &&
      !usedFreezes.has(isoWeekKey(cursor));

    if (isSingleGap) {
      usedFreezes.add(isoWeekKey(cursor));
      continue;
    }

    best = Math.max(best, current);
    current = 0;
    previousActive = null;
    usedFreezes.clear();
  }

  return Math.max(best, current);
}
