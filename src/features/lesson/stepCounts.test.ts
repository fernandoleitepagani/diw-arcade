import { describe, expect, it } from 'vitest';
import { newCard } from '../../lib/srs/fsrs';
import { createEmptySave } from '../../lib/storage';
import { getStepCounts } from './stepCounts';

const NOW = new Date('2026-01-05T12:00:00.000Z');
const ids = (prefix: string, count: number) =>
  Array.from({ length: count }, (_, i) => ({ id: `${prefix}${i + 1}` }));

const content = {
  questions: { n09: ids('n09-q', 10) },
  flashcards: { n09: ids('n09-f', 27) },
  challenges: { n09: ids('n09-c', 3) },
};

describe('getStepCounts', () => {
  it('builds the four tile captions from real data', () => {
    const save = createEmptySave(NOW);
    save.quiz.rounds.n09 = { best: 80, count: 2, perfect: false };
    for (const card of content.flashcards.n09.slice(0, 6)) {
      save.cards[card.id] = newCard(NOW);
    }
    expect(getStepCounts(save, 'n09', content, { now: NOW, primerPoints: 10 })).toEqual({
      ler: '10 pontos',
      praticar: '8 de 10 certas',
      fixar: '6 cartas hoje',
      construir: '3 desafios',
    });
  });

  it('falls back to counts when nothing was played, and handles singulars', () => {
    const save = createEmptySave(NOW);
    expect(
      getStepCounts(
        save,
        'n09',
        {
          questions: { n09: ids('q', 1) },
          flashcards: { n09: [] },
          challenges: { n09: ids('c', 1) },
        },
        { now: NOW, primerPoints: 1 },
      ),
    ).toEqual({
      ler: '1 ponto',
      praticar: '1 pergunta',
      fixar: '0 cartas hoje',
      construir: '1 desafio',
    });
  });

  it('says there is no summary when the node has no primer', () => {
    const save = createEmptySave(NOW);
    expect(getStepCounts(save, 'n09', content, { now: NOW }).ler).toBe('sem resumo');
  });
});
