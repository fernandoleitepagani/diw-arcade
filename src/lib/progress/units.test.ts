import { describe, expect, it } from 'vitest';
import { newCard } from '../srs/fsrs';
import { createEmptySave, type SaveV1 } from '../storage';
import type { ProgressContent } from './events';
import { getCompletedUnitIds } from './units';

const NOW = new Date('2026-01-05T12:00:00.000Z');

const content: ProgressContent = {
  questions: { n01: [{ id: 'n01-q001' }], n02: [{ id: 'n02-q001' }] },
  flashcards: { n01: [{ id: 'n01-f001' }], n02: [{ id: 'n02-f001' }] },
  challenges: { n01: [{ id: 'n01-c01' }], n02: [{ id: 'n02-c01' }] },
};

function completeNode(
  save: SaveV1,
  nodeId: 'n01' | 'n02',
  cardId: string,
  challengeId: string,
): void {
  save.quiz.rounds[nodeId] = { best: 100, count: 1, perfect: true };
  save.cards[cardId] = { ...newCard(NOW), reps: 1, state: 2 };
  save.challenges[challengeId] = {
    passed: true,
    failedRuns: 0,
    hintsUsed: 0,
    xpAwarded: 30,
    code: null,
  };
}

describe('getCompletedUnitIds', () => {
  it('reports no completed unit on an empty save', () => {
    expect(getCompletedUnitIds(createEmptySave(NOW), content)).toEqual([]);
  });

  it('reports u1 only when both of its nodes have all three stars', () => {
    const save = createEmptySave(NOW);
    completeNode(save, 'n01', 'n01-f001', 'n01-c01');
    expect(getCompletedUnitIds(save, content)).toEqual([]);

    completeNode(save, 'n02', 'n02-f001', 'n02-c01');
    expect(getCompletedUnitIds(save, content)).toEqual(['u1']);
  });
});
