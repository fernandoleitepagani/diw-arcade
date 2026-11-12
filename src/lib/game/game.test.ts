import { describe, expect, it } from 'vitest';

import {
  ACHIEVEMENTS,
  addDays,
  challengePassXp,
  evaluateAchievements,
  isActiveDay,
  labStepXp,
  levelForXp,
  levelProgress,
  quizAnswerXp,
  toDayKey,
  xpForLevel,
  type AchievementStats,
} from './index';

const EMPTY_STATS: AchievementStats = {
  xpTotal: 0,
  correctAnswers: 0,
  perfectRounds: 0,
  cardReviews: 0,
  challengesPassed: 0,
  noHintPasses: 0,
  streak: 0,
  goalDaysHit: 0,
  level: 1,
  completedUnits: 0,
  completedNodes: 0,
};

describe('XP economy', () => {
  it('awards quiz XP only for correct answers, with a first-try bonus', () => {
    expect(quizAnswerXp(true, true)).toBe(15);
    expect(quizAnswerXp(true, false)).toBe(10);
    expect(quizAnswerXp(false, true)).toBe(0);
    expect(quizAnswerXp(false, false)).toBe(0);
  });

  it('discounts challenge XP per hint and never goes negative', () => {
    expect([0, 1, 2, 3].map(challengePassXp)).toEqual([30, 25, 20, 15]);
  });

  it('awards the lab step XP only once', () => {
    expect(labStepXp(false)).toBe(3);
    expect(labStepXp(true)).toBe(0);
  });
});

describe('levels', () => {
  it('maps the AC7 XP thresholds to levels', () => {
    expect([0, 99, 100, 249, 250, 450, 700].map(levelForXp)).toEqual([1, 1, 2, 2, 3, 4, 5]);
  });

  it('computes the XP needed for each level', () => {
    expect([1, 2, 3, 4, 5].map(xpForLevel)).toEqual([0, 100, 250, 450, 700]);
  });

  it('reports progress inside the current level', () => {
    expect(levelProgress(120)).toEqual({
      level: 2,
      xpInLevel: 20,
      xpForNextLevel: 150,
      progress: 20 / 150,
    });
  });

  it('never reports less than level 1', () => {
    expect(levelForXp(-10)).toBe(1);
  });
});

describe('days', () => {
  it('formats a local day key', () => {
    expect(toDayKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('treats any practice action as an active day', () => {
    expect(isActiveDay({ xp: 0, labs: 1 })).toBe(true);
    expect(isActiveDay({ xp: 1 })).toBe(true);
    expect(isActiveDay({ xp: 0, quiz: 1 })).toBe(true);
    expect(isActiveDay({ xp: 0, cards: 1 })).toBe(true);
    expect(isActiveDay({ xp: 0, challenges: 1 })).toBe(true);
    expect(isActiveDay({ xp: 0, quiz: 0, cards: 0, challenges: 0, labs: 0 })).toBe(false);
  });
});

describe('achievements', () => {
  it('defines 12 unique achievement ids', () => {
    expect(ACHIEVEMENTS).toHaveLength(12);
    expect(new Set(ACHIEVEMENTS.map((achievement) => achievement.id)).size).toBe(12);
    expect(ACHIEVEMENTS.map((achievement) => achievement.id)).toEqual([
      'primeiro-passo',
      'dez-acertos',
      'rodada-perfeita',
      'memoria-50',
      'primeiro-desafio',
      'sem-dicas',
      'desafios-10',
      'sequencia-3',
      'sequencia-7',
      'meta-diaria',
      'unidade-completa',
      'arvore-completa',
    ]);
  });

  it('unlocks nothing for a fresh save', () => {
    expect(evaluateAchievements(EMPTY_STATS, {})).toEqual([]);
  });

  it('returns only the ids that were not already unlocked', () => {
    const stats: AchievementStats = {
      ...EMPTY_STATS,
      xpTotal: 100,
      correctAnswers: 10,
      challengesPassed: 1,
      noHintPasses: 1,
      streak: 3,
      goalDaysHit: 1,
    };

    const unlocked = {
      'primeiro-passo': '2026-11-10T12:00:00.000Z',
      'dez-acertos': '2026-11-10T12:00:00.000Z',
    };

    expect(evaluateAchievements(stats, unlocked)).toEqual([
      'primeiro-desafio',
      'sem-dicas',
      'sequencia-3',
      'meta-diaria',
    ]);
    expect(evaluateAchievements(stats, {})).toContain('primeiro-passo');
  });
});
