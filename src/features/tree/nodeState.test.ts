import { describe, expect, it } from 'vitest';
import type { ProgressContent } from '../../lib/progress/events';
import { newCard } from '../../lib/srs/fsrs';
import { createEmptySave } from '../../lib/storage';
import { getNodeState, NODE_STATE_LABEL } from './nodeState';

const NOW = new Date('2026-01-05T12:00:00.000Z');

const CONTENT: ProgressContent = {
  questions: { n01: [{ id: 'n01-q001' }] },
  flashcards: { n01: [{ id: 'n01-f001' }] },
  challenges: { n01: [{ id: 'n01-c01' }] },
};

describe('getNodeState', () => {
  it('labels a node without activity as nova', () => {
    const save = createEmptySave(NOW);

    expect(getNodeState(save, 'n01', CONTENT)).toBe('nova');
    // v4: state copy follows the prototype.
    expect(NODE_STATE_LABEL.nova).toBe('Não iniciado');
  });

  it('labels a node with one quiz answer as em progresso', () => {
    const save = createEmptySave(NOW);
    save.quiz.answers['n01-q001'] = {
      seen: 1,
      correct: 1,
      lastCorrect: true,
    };

    expect(getNodeState(save, 'n01', CONTENT)).toBe('em-progresso');
    // v4: state copy follows the prototype.
    expect(NODE_STATE_LABEL['em-progresso']).toBe('Em andamento');
  });

  it('labels a node with all three stars as dominada', () => {
    const save = createEmptySave(NOW);
    save.quiz.rounds.n01 = { best: 100, count: 1, perfect: true };
    save.cards['n01-f001'] = { ...newCard(NOW), reps: 1, state: 2 };
    save.challenges['n01-c01'] = {
      passed: true,
      failedRuns: 0,
      hintsUsed: 0,
      xpAwarded: 10,
      code: null,
    };

    expect(getNodeState(save, 'n01', CONTENT)).toBe('dominada');
    // v4: state copy follows the prototype.
    expect(NODE_STATE_LABEL.dominada).toBe('Concluído');
  });
});
