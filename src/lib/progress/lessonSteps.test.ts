import { describe, expect, it } from 'vitest';
import type { NodeId } from '../../content/tree';
import { newCard } from '../srs/fsrs';
import { createEmptySave, type SaveV1 } from '../storage';
import type { ProgressContent } from './events';
import { firstUnfinishedStep, getLessonSteps } from './lessonSteps';

const NOW = new Date('2026-01-05T12:00:00.000Z');
const NODE = 'n07' as NodeId;
const CARD_IDS = ['n07-f001', 'n07-f002'];
const content: ProgressContent = {
  questions: { n07: [{ id: 'n07-q001' }] },
  flashcards: { n07: CARD_IDS.map((id) => ({ id })) },
  challenges: { n07: [{ id: 'n07-c01' }, { id: 'n07-c02' }] },
};
const none = { hasPrimer: false, primersRead: new Set<NodeId>() };

function quizDone(save: SaveV1): void {
  save.quiz.rounds[NODE] = { ...(save.quiz.rounds[NODE] as object), best: 100 } as never;
}
function cardsDone(save: SaveV1): void {
  for (const id of CARD_IDS) save.cards[id] = { ...newCard(NOW), reps: 1, state: 2 };
}
function codeDone(save: SaveV1): void {
  for (const id of ['n07-c01', 'n07-c02'])
    save.challenges[id] = { ...(save.challenges[id] as object), passed: true } as never;
}

describe('getLessonSteps', () => {
  it('fresh save: ler indisponivel, others pendente', () => {
    const steps = getLessonSteps(createEmptySave(NOW), NODE, content, none);
    expect(steps).toEqual({
      ler: 'indisponivel',
      praticar: 'pendente',
      fixar: 'pendente',
      construir: 'pendente',
    });
  });

  it('ler follows primer availability and read set', () => {
    const save = createEmptySave(NOW);
    expect(
      getLessonSteps(save, NODE, content, { hasPrimer: true, primersRead: new Set() }).ler,
    ).toBe('pendente');
    expect(
      getLessonSteps(save, NODE, content, { hasPrimer: true, primersRead: new Set([NODE]) }).ler,
    ).toBe('feito');
    expect(
      getLessonSteps(save, NODE, content, { hasPrimer: false, primersRead: new Set([NODE]) }).ler,
    ).toBe('indisponivel');
  });

  it('each step is independent', () => {
    const a = createEmptySave(NOW);
    quizDone(a);
    expect(getLessonSteps(a, NODE, content, none)).toMatchObject({
      praticar: 'feito', fixar: 'pendente', construir: 'pendente',
    });
    const b = createEmptySave(NOW);
    cardsDone(b);
    expect(getLessonSteps(b, NODE, content, none)).toMatchObject({
      praticar: 'pendente', fixar: 'feito', construir: 'pendente',
    });
    const c = createEmptySave(NOW);
    codeDone(c);
    expect(getLessonSteps(c, NODE, content, none)).toMatchObject({
      praticar: 'pendente', fixar: 'pendente', construir: 'feito',
    });
  });

  it('construir needs all challenges; none means indisponivel', () => {
    const save = createEmptySave(NOW);
    save.challenges['n07-c01'] = { passed: true } as never;
    expect(getLessonSteps(save, NODE, content, none).construir).toBe('pendente');
    expect(getLessonSteps(save, NODE, { ...content, challenges: {} }, none).construir).toBe(
      'indisponivel',
    );
  });
});

describe('firstUnfinishedStep', () => {
  it('skips indisponivel and feito', () => {
    expect(
      firstUnfinishedStep({ ler: 'indisponivel', praticar: 'feito', fixar: 'pendente', construir: 'pendente' }),
    ).toBe('fixar');
  });
  it('returns null when all finished', () => {
    expect(
      firstUnfinishedStep({ ler: 'indisponivel', praticar: 'feito', fixar: 'feito', construir: 'indisponivel' }),
    ).toBeNull();
  });
});
