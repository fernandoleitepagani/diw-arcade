import { describe, expect, it } from 'vitest';
import type { McqQuestion } from '../../content/schema';
import {
  answer,
  currentQuestion,
  firstTryCount,
  isComplete,
  pickRound,
  questionNumber,
  startSession,
  type QuizAnswers,
} from './session';

function mcq(index: number): McqQuestion {
  return {
    id: `n07-q0${String(index).padStart(2, '0')}`,
    nodeId: 'n07',
    type: 'mcq',
    prompt: `Pergunta ${index}?`,
    options: ['a', 'b', 'c', 'd'],
    answer: 0,
    explanation: 'Explicação.',
    source: { aula: 172, slide: 2 },
    evidence: 'A propriedade color define a cor do texto de um elemento.',
  };
}

function stats(correct: number, seen: number): QuizAnswers[string] {
  return { seen, correct, lastCorrect: correct > 0 };
}

describe('pickRound', () => {
  it('prioriza perguntas não vistas', () => {
    const questions = [mcq(1), mcq(2), mcq(3), mcq(4)];
    const answers: QuizAnswers = {
      'n07-q001': stats(1, 1),
      'n07-q002': stats(1, 1),
    };

    const round = pickRound(questions, answers, () => 0, 2);

    expect(round).toHaveLength(2);
    expect(new Set(round.map((question) => question.id))).toEqual(
      new Set(['n07-q003', 'n07-q004']),
    );
  });

  it('depois das não vistas, traz a menor taxa de acerto', () => {
    const questions = [mcq(1), mcq(2), mcq(3), mcq(4)];
    const answers: QuizAnswers = {
      'n07-q001': stats(2, 2),
      'n07-q002': stats(1, 4),
      'n07-q003': stats(0, 2),
      'n07-q004': stats(3, 4),
    };

    const round = pickRound(questions, answers, () => 0, 2);

    expect(new Set(round.map((question) => question.id))).toEqual(
      new Set(['n07-q002', 'n07-q003']),
    );
  });

  it('embaralha a seleção sem alterar a lista original', () => {
    const questions = [mcq(1), mcq(2), mcq(3), mcq(4), mcq(5)];
    const original = [...questions];

    const round = pickRound(questions, {}, () => 0.5, 3);

    expect(round).toHaveLength(3);
    expect(questions).toEqual(original);
    expect(new Set(round.map((question) => question.id)).size).toBe(3);
  });

  it('usa 10 perguntas por padrão', () => {
    const questions = Array.from({ length: 14 }, (_, index) => mcq(index + 1));

    expect(pickRound(questions, {}, () => 0.5)).toHaveLength(10);
  });
});

describe('sessão', () => {
  it('devolve a pergunta errada ao fim da fila', () => {
    const session = startSession([mcq(1), mcq(2)]);

    const result = answer(session, false);

    expect(result.firstTry).toBe(false);
    expect(result.done).toBe(false);
    expect(result.session.queue.map((question) => question.id)).toEqual([
      'n07-q002',
      'n07-q001',
    ]);
    expect(currentQuestion(result.session)?.id).toBe('n07-q002');
  });

  it('marca firstTry apenas no acerto de primeira', () => {
    const session = startSession([mcq(1), mcq(2)]);

    const first = answer(session, true);
    expect(first.firstTry).toBe(true);
    expect(firstTryCount(first.session)).toBe(1);

    const missed = answer(startSession([mcq(1)]), false);
    const retry = answer(missed.session, true);

    expect(retry.firstTry).toBe(false);
    expect(firstTryCount(retry.session)).toBe(0);
    expect(retry.done).toBe(true);
  });

  it('termina quando a fila fica vazia', () => {
    const session = startSession([mcq(1), mcq(2)]);

    const first = answer(session, true);
    expect(isComplete(first.session)).toBe(false);
    expect(questionNumber(first.session)).toBe(2);

    const second = answer(first.session, true);
    expect(second.done).toBe(true);
    expect(isComplete(second.session)).toBe(true);
    expect(firstTryCount(second.session)).toBe(2);
  });
});
