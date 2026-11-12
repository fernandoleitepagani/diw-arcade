import type { SaveV1 } from '../storage/schema';
import {
  achievementStats,
  getLevel,
  getLongestStreak,
  getStreak,
  getTodayXp,
} from './selectors';

export { achievementStats };

export interface ProgressTotals {
  xpTotal: number;
  level: number;
  todayXp: number;
  streak: number;
  longestStreak: number;
  reviews: number;
  challengesPassed: number;
  labStepsDone: number;
}

/** Header-level totals used by the HUD and the stats dashboard. */
export function getProgressTotals(save: SaveV1, now: Date): ProgressTotals {
  return {
    xpTotal: save.xpTotal,
    level: getLevel(save),
    todayXp: getTodayXp(save, now),
    streak: getStreak(save, now),
    longestStreak: getLongestStreak(save),
    reviews: save.reviews.length,
    challengesPassed: Object.values(save.challenges).filter(
      (challenge) => challenge.passed,
    ).length,
    labStepsDone: Object.values(save.labs)
      .flatMap((steps) => Object.values(steps))
      .filter((step) => step.done).length,
  };
}
