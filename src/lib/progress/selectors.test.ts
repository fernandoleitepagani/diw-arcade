import { describe, expect, it } from 'vitest';
import { newCard } from '../srs/fsrs';
import { createEmptySave, type SaveV1, type SrsCard } from '../storage';
import type { ProgressContent } from './events';
import {
  getLabProgress,
  getNewIntroducedToday,
  getReviewsDoneToday,
  getStars,
  isPrimerRead,
} from './selectors';

const NOW = new Date('2026-01-05T12:00:00.000Z');
const TODAY = '2026-01-05';
const YESTERDAY = '2026-01-04';

const CARD_IDS = [
  'n07-f001',
  'n07-f002',
  'n07-f003',
  'n07-f004',
  'n07-f005',
  'n07-f006',
] as const;

const content: ProgressContent = {
  questions: { n07: [{ id: 'n07-q001' }] },
  flashcards: { n07: CARD_IDS.map((id) => ({ id })) },
  challenges: { n07: [{ id: 'n07-c01' }] },
};

function empty(): SaveV1 {
  return createEmptySave(NOW);
}

function reviewedCard(state: 0 | 1 | 2 | 3): SrsCard {
  return { ...newCard(NOW), reps: 1, state };
}

function allStars(): SaveV1 {
  const save = empty();
  save.quiz.rounds['n07'] = { best: 90, count: 1, perfect: true };
  for (const id of CARD_IDS) save.cards[id] = reviewedCard(2);
  save.challenges['n07-c01'] = {
    passed: true,
    failedRuns: 0,
    hintsUsed: 0,
    xpAwarded: 30,
    code: null,
  };
  return save;
}

describe('getStars', () => {
  it('lights all three stars at the thresholds', () => {
    expect(getStars(allStars(), 'n07', content)).toEqual({
      quiz: true,
      cards: true,
      code: true,
    });
  });

  it('requires 80% on the quiz star', () => {
    const save = allStars();
    save.quiz.rounds['n07'] = { best: 79, count: 1, perfect: false };
    expect(getStars(save, 'n07', content).quiz).toBe(false);

    save.quiz.rounds['n07'] = { best: 80, count: 1, perfect: false };
    expect(getStars(save, 'n07', content).quiz).toBe(true);
  });

  it('requires every card reviewed and 80% in the Review state', () => {
    const save = allStars();
    save.cards['n07-f001'] = reviewedCard(0);
    save.cards['n07-f002'] = reviewedCard(0);
    // 4 of 6 in Review: 66%, below the threshold.
    expect(getStars(save, 'n07', content).cards).toBe(false);

    save.cards['n07-f002'] = reviewedCard(2);
    // 5 of 6 in Review: 83%, above the threshold.
    expect(getStars(save, 'n07', content).cards).toBe(true);

    save.cards['n07-f006'] = newCard(NOW);
    expect(getStars(save, 'n07', content).cards).toBe(false);
  });

  it('requires every challenge to pass', () => {
    const save = allStars();
    save.challenges['n07-c01'] = {
      ...save.challenges['n07-c01']!,
      passed: false,
    };
    expect(getStars(save, 'n07', content).code).toBe(false);
  });

  it('never lights a star without an item in that mode', () => {
    expect(getStars(allStars(), 'n07', {})).toEqual({
      quiz: false,
      cards: false,
      code: false,
    });
  });
});

describe('daily counters', () => {
  it('counts the cards introduced today', () => {
    const save = empty();
    save.introduced['n07-f001'] = TODAY;
    save.introduced['n07-f002'] = YESTERDAY;
    save.introduced['n07-f003'] = TODAY;

    expect(getNewIntroducedToday(save, NOW)).toBe(2);
  });

  it('counts today reviews except cards introduced today', () => {
    const save = empty();
    save.introduced['n07-f001'] = TODAY;
    save.introduced['n07-f002'] = YESTERDAY;
    save.reviews = [
      { cardId: 'n07-f001', grade: 3, at: NOW.toISOString() },
      { cardId: 'n07-f002', grade: 3, at: NOW.toISOString() },
      {
        cardId: 'n07-f002',
        grade: 3,
        at: new Date('2026-01-04T12:00:00.000Z').toISOString(),
      },
    ];

    expect(getReviewsDoneToday(save, NOW)).toBe(1);
  });
});

describe('getLabProgress', () => {
  it('reports done and total steps from the guide', () => {
    const save = empty();
    save.labs['lab-01'] = {
      estrutura: { done: true, xpAwarded: true },
      lista: { done: true, xpAwarded: true },
      estilo: { done: false, xpAwarded: false },
    };
    const guide = {
      labs: {
        'lab-01': {
          steps: [
            { id: 'estrutura' },
            { id: 'lista' },
            { id: 'estilo' },
            { id: 'formulario' },
            { id: 'publicacao' },
          ],
        },
      },
    } satisfies ProgressContent;

    expect(getLabProgress(save, 'lab-01', guide)).toEqual({
      done: 2,
      total: 5,
    });
    expect(getLabProgress(save, 'lab-01', 5)).toEqual({ done: 2, total: 5 });
  });

  it('falls back to the recorded steps without a guide', () => {
    const save = empty();
    save.labs['lab-01'] = {
      estrutura: { done: true, xpAwarded: true },
      lista: { done: false, xpAwarded: false },
    };

    expect(getLabProgress(save, 'lab-01')).toEqual({ done: 1, total: 2 });
  });
});

describe('isPrimerRead', () => {
  it('ignores inherited object keys', () => {
    expect(isPrimerRead(createEmptySave(NOW), 'constructor' as never)).toBe(false);
  });
});
