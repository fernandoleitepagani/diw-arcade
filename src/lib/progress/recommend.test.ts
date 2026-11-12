import { describe, expect, it } from 'vitest';
import { NODE_IDS, type NodeId } from '../../content/tree';
import { newCard, type SrsCard } from '../srs/fsrs';
import { createEmptySave, type SaveV1 } from '../storage';
import type { ProgressContent } from './events';
import { getRecommendedNodeId } from './recommend';

const NOW = new Date('2026-01-05T12:00:00.000Z');

function empty(): SaveV1 {
  return createEmptySave(NOW);
}

function dueCard(): SrsCard {
  return {
    ...newCard(NOW),
    due: new Date(NOW.getTime() - 60_000).toISOString(),
    reps: 1,
    state: 2,
  };
}

function futureCard(): SrsCard {
  return {
    ...newCard(NOW),
    due: new Date(NOW.getTime() + 86_400_000).toISOString(),
    reps: 1,
    state: 2,
  };
}

describe('getRecommendedNodeId', () => {
  it('sends a fresh save to n01', () => {
    expect(getRecommendedNodeId(empty(), {}, NOW)).toBe('n01');
  });

  it('picks the node with the most due cards', () => {
    const content: ProgressContent = {
      flashcards: {
        n05: [{ id: 'n05-f001' }, { id: 'n05-f002' }, { id: 'n05-f003' }],
        n09: [
          { id: 'n09-f001' },
          { id: 'n09-f002' },
          { id: 'n09-f003' },
          { id: 'n09-f004' },
          { id: 'n09-f005' },
          { id: 'n09-f006' },
          { id: 'n09-f007' },
        ],
      },
    };
    const save = empty();
    for (const id of ['n05-f001', 'n05-f002', 'n05-f003']) {
      save.cards[id] = dueCard();
    }
    for (let index = 1; index <= 7; index += 1) {
      save.cards[`n09-f00${index}`] = dueCard();
    }

    expect(getRecommendedNodeId(save, content, NOW)).toBe('n09');
  });

  it('breaks due-card ties toward the earliest node', () => {
    const content: ProgressContent = {
      flashcards: {
        n05: [{ id: 'n05-f001' }, { id: 'n05-f002' }, { id: 'n05-f003' }],
        n09: [{ id: 'n09-f001' }, { id: 'n09-f002' }, { id: 'n09-f003' }],
      },
    };
    const save = empty();
    for (const id of ['n05-f001', 'n05-f002', 'n05-f003', 'n09-f001', 'n09-f002', 'n09-f003']) {
      save.cards[id] = dueCard();
    }

    expect(getRecommendedNodeId(save, content, NOW)).toBe('n05');
  });

  it('otherwise picks the earliest content node with the fewest stars', () => {
    const content: ProgressContent = {
      questions: { n01: [{ id: 'n01-q001' }], n02: [{ id: 'n02-q001' }] },
      flashcards: { n01: [{ id: 'n01-f001' }] },
      challenges: { n01: [{ id: 'n01-c01' }] },
    };
    const save = empty();
    // n01 has all three stars.
    save.quiz.rounds['n01'] = { best: 100, count: 1, perfect: true };
    save.cards['n01-f001'] = futureCard();
    save.challenges['n01-c01'] = {
      passed: true,
      failedRuns: 0,
      hintsUsed: 0,
      xpAwarded: 30,
      code: null,
    };
    // n02 has only the quiz star.
    save.quiz.rounds['n02'] = { best: 90, count: 1, perfect: false };

    expect(getRecommendedNodeId(save, content, NOW)).toBe('n02');
  });

  it('falls back to n01 when every node is at three stars', () => {
    const content: ProgressContent = {
      questions: Object.fromEntries(
        NODE_IDS.map((id: NodeId) => [id, [{ id: `${id}-q001` }]]),
      ),
      flashcards: Object.fromEntries(
        NODE_IDS.map((id: NodeId) => [id, [{ id: `${id}-f001` }]]),
      ),
      challenges: Object.fromEntries(
        NODE_IDS.map((id: NodeId) => [id, [{ id: `${id}-c01` }]]),
      ),
    };
    const save = empty();
    for (const nodeId of NODE_IDS) {
      save.quiz.rounds[nodeId] = { best: 100, count: 1, perfect: true };
      save.cards[`${nodeId}-f001`] = futureCard();
      save.challenges[`${nodeId}-c01`] = {
        passed: true,
        failedRuns: 0,
        hintsUsed: 0,
        xpAwarded: 30,
        code: null,
      };
    }

    expect(getRecommendedNodeId(save, content, NOW)).toBe('n01');
  });
});
