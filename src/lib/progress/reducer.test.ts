import { describe, expect, it } from 'vitest';
import { buildContentIndex } from '../../content';
import { fixtureContent } from '../../test/fixtures';
import { newCard } from '../srs/fsrs';
import { createEmptySave, type SaveV1 } from '../storage';
import { applyEvent } from './reducer';
import { isSolutionUnlocked } from './selectors';

const NOW = new Date('2026-01-05T12:00:00.000Z');
const TODAY = '2026-01-05';
const YESTERDAY = '2026-01-04';

const content = buildContentIndex(fixtureContent);

function empty(now: Date = NOW): SaveV1 {
  return createEmptySave(now);
}

function apply(save: SaveV1, event: Parameters<typeof applyEvent>[1], now = NOW) {
  return applyEvent(save, event, now, content);
}

function activeDay(xp = 10): SaveV1['days'][string] {
  return { xp, quiz: 1, cards: 0, challenges: 0, labs: 0 };
}

describe('applyEvent — XP', () => {
  it('grants 15 XP for a first-try correct quiz answer', () => {
    const { save, outcome } = apply(empty(), {
      type: 'quiz/answer',
      nodeId: 'n07',
      questionId: 'n07-q001',
      correct: true,
      firstTry: true,
    });

    expect(outcome.xpGained).toBe(15);
    expect(save.xpTotal).toBe(15);
    expect(save.days[TODAY]?.xp).toBe(15);
    expect(save.days[TODAY]?.quiz).toBe(1);
  });

  it('grants 10 XP for a correct answer after a retry', () => {
    const { save, outcome } = apply(empty(), {
      type: 'quiz/answer',
      nodeId: 'n07',
      questionId: 'n07-q001',
      correct: true,
      firstTry: false,
    });

    expect(outcome.xpGained).toBe(10);
    expect(save.xpTotal).toBe(10);
  });

  it('grants no XP for a wrong answer but still marks the day active', () => {
    const { save, outcome } = apply(empty(), {
      type: 'quiz/answer',
      nodeId: 'n07',
      questionId: 'n07-q001',
      correct: false,
      firstTry: true,
    });

    expect(outcome.xpGained).toBe(0);
    expect(save.xpTotal).toBe(0);
    expect(save.days[TODAY]?.quiz).toBe(1);
  });

  it('grants 5 XP for a card review and creates the card when missing', () => {
    const { save, outcome } = apply(empty(), {
      type: 'card/review',
      nodeId: 'n07',
      cardId: 'n07-f001',
      grade: 3,
    });

    expect(outcome.xpGained).toBe(5);
    expect(save.xpTotal).toBe(5);
    expect(save.cards['n07-f001']?.reps).toBe(1);
    expect(save.introduced['n07-f001']).toBe(TODAY);
    expect(save.reviews).toHaveLength(1);
    expect(save.days[TODAY]?.cards).toBe(1);
  });
});

describe('applyEvent — challenges', () => {
  it('pays 30 minus 5 per hint and only pays the first pass', () => {
    let save = empty();
    save = apply(save, {
      type: 'challenge/hint',
      nodeId: 'n07',
      challengeId: 'n07-c01',
      tier: 1,
    }).save;
    save = apply(save, {
      type: 'challenge/hint',
      nodeId: 'n07',
      challengeId: 'n07-c01',
      tier: 2,
    }).save;

    const first = apply(save, {
      type: 'challenge/run',
      nodeId: 'n07',
      challengeId: 'n07-c01',
      passed: true,
    });
    expect(first.outcome.xpGained).toBe(20);
    expect(first.save.xpTotal).toBe(20);
    expect(first.save.challenges['n07-c01']?.xpAwarded).toBe(20);
    expect(first.save.days[TODAY]?.challenges).toBe(1);

    const second = apply(first.save, {
      type: 'challenge/run',
      nodeId: 'n07',
      challengeId: 'n07-c01',
      passed: true,
    });
    expect(second.outcome.xpGained).toBe(0);
    expect(second.save.xpTotal).toBe(20);
    expect(second.save.days[TODAY]?.challenges).toBe(1);
  });

  it('ignores hint 2 before hint 1', () => {
    const { save, outcome } = apply(empty(), {
      type: 'challenge/hint',
      nodeId: 'n07',
      challengeId: 'n07-c01',
      tier: 2,
    });

    expect(outcome.xpGained).toBe(0);
    expect(save.challenges['n07-c01']).toBeUndefined();
  });

  it('unlocks the solution after three failed runs', () => {
    let save = empty();
    for (let run = 0; run < 3; run += 1) {
      expect(isSolutionUnlocked(save, 'n07-c01')).toBe(false);
      save = apply(save, {
        type: 'challenge/run',
        nodeId: 'n07',
        challengeId: 'n07-c01',
        passed: false,
      }).save;
    }

    expect(save.challenges['n07-c01']?.failedRuns).toBe(3);
    expect(isSolutionUnlocked(save, 'n07-c01')).toBe(true);
  });
});

describe('applyEvent — labs', () => {
  it('grants 3 XP once and counts each check as a lab action', () => {
    const first = apply(empty(), {
      type: 'lab/step',
      labId: 'lab-01',
      stepId: 'estrutura',
      done: true,
    });
    expect(first.outcome.xpGained).toBe(3);
    expect(first.save.xpTotal).toBe(3);
    expect(first.save.days[TODAY]?.labs).toBe(1);
    expect(first.save.labs['lab-01']?.['estrutura']).toEqual({
      done: true,
      xpAwarded: true,
    });

    const unchecked = apply(first.save, {
      type: 'lab/step',
      labId: 'lab-01',
      stepId: 'estrutura',
      done: false,
    });
    expect(unchecked.save.xpTotal).toBe(3);
    expect(unchecked.save.labs['lab-01']?.['estrutura']).toEqual({
      done: false,
      xpAwarded: true,
    });

    const rechecked = apply(unchecked.save, {
      type: 'lab/step',
      labId: 'lab-01',
      stepId: 'estrutura',
      done: true,
    });
    expect(rechecked.outcome.xpGained).toBe(0);
    expect(rechecked.save.xpTotal).toBe(3);
    expect(rechecked.save.days[TODAY]?.labs).toBe(2);
  });
});

describe('applyEvent — whole deck, onboarding and settings', () => {
  it('deck/introduce creates New cards and records the day with 0 XP', () => {
    const { save, outcome } = apply(empty(), {
      type: 'deck/introduce',
      nodeId: 'n07',
    });

    expect(outcome.xpGained).toBe(0);
    expect(save.xpTotal).toBe(0);
    expect(Object.keys(save.cards)).toHaveLength(6);
    expect(Object.keys(save.introduced)).toHaveLength(6);
    expect(Object.values(save.introduced)).toEqual(
      expect.arrayContaining([TODAY]),
    );
    expect(Object.values(save.cards).every((card) => card.reps === 0)).toBe(true);
    expect(save.days).toEqual({});
  });

  it('onboarding/complete sets onboarded and the daily goal', () => {
    const { save, outcome } = apply(empty(), {
      type: 'onboarding/complete',
      dailyGoal: 100,
    });

    expect(save.onboarded).toBe(true);
    expect(save.settings.dailyGoal).toBe(100);
    expect(outcome.xpGained).toBe(0);
  });

  it('settings/update merges the patch', () => {
    const { save } = apply(empty(), {
      type: 'settings/update',
      patch: { sound: true, reviewsPerDay: 200 },
    });

    expect(save.settings.sound).toBe(true);
    expect(save.settings.reviewsPerDay).toBe(200);
    expect(save.settings.dailyGoal).toBe(50);
  });
});

describe('applyEvent — save-wide rules', () => {
  it('caps the review log at 5000 entries', () => {
    const save = empty();
    save.reviews = Array.from({ length: 5000 }, (_, index) => ({
      cardId: `n07-f00${(index % 6) + 1}`,
      grade: 3 as const,
      at: NOW.toISOString(),
    }));

    const { save: next } = apply(save, {
      type: 'card/review',
      nodeId: 'n07',
      cardId: 'n07-f001',
      grade: 3,
    });

    expect(next.reviews).toHaveLength(5000);
    expect(next.reviews[next.reviews.length - 1]?.cardId).toBe('n07-f001');
  });

  it('unlocks an achievement only once', () => {
    const first = apply(empty(), {
      type: 'quiz/answer',
      nodeId: 'n07',
      questionId: 'n07-q001',
      correct: true,
      firstTry: true,
    });

    expect(first.outcome.achievements).toContain('primeiro-passo');
    expect(first.save.achievements['primeiro-passo']).toBe(NOW.toISOString());

    const second = apply(first.save, {
      type: 'quiz/answer',
      nodeId: 'n07',
      questionId: 'n07-q002',
      correct: true,
      firstTry: true,
    });

    expect(second.outcome.achievements).not.toContain('primeiro-passo');
  });

  it('reports a level-up and a newly extended streak', () => {
    const save = empty();
    save.xpTotal = 90;
    const leveled = apply(save, {
      type: 'quiz/answer',
      nodeId: 'n07',
      questionId: 'n07-q001',
      correct: true,
      firstTry: true,
    });
    expect(leveled.save.xpTotal).toBe(105);
    expect(leveled.outcome.levelUp).toBe(2);

    const withYesterday = empty();
    withYesterday.xpTotal = 10;
    withYesterday.days[YESTERDAY] = activeDay();
    const extended = apply(withYesterday, {
      type: 'quiz/answer',
      nodeId: 'n07',
      questionId: 'n07-q001',
      correct: true,
      firstTry: true,
    });
    expect(extended.outcome.streakExtended).toBe(2);
  });

  it('does not mutate the input save', () => {
    const save = empty();
    save.cards['n07-f001'] = newCard(NOW);
    save.quiz.rounds['n07'] = { best: 50, count: 1, perfect: false };
    save.challenges['n07-c01'] = {
      passed: false,
      failedRuns: 1,
      hintsUsed: 1,
      xpAwarded: 0,
      code: { html: '', css: '', js: '' },
    };
    const before = structuredClone(save);

    apply(save, {
      type: 'card/review',
      nodeId: 'n07',
      cardId: 'n07-f001',
      grade: 4,
    });
    apply(save, {
      type: 'challenge/run',
      nodeId: 'n07',
      challengeId: 'n07-c01',
      passed: true,
    });
    apply(save, {
      type: 'lab/step',
      labId: 'lab-01',
      stepId: 'estrutura',
      done: true,
    });

    expect(save).toEqual(before);
  });
});
