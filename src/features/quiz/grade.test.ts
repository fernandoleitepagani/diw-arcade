import { describe, expect, it } from 'vitest';
import type { FillQuestion } from '../../content/schema';
import { isFillCorrect, normalizeAnswer } from './grade';

function fill(answers: string[]): FillQuestion {
  return {
    id: 'n07-q010',
    nodeId: 'n07',
    type: 'fill',
    prompt: 'A propriedade ____ define a cor do texto.',
    answers,
    explanation: 'A palavra color completa a propriedade.',
    source: { aula: 172, slide: 2 },
    evidence: 'A propriedade color define a cor do texto de um elemento.',
  };
}

describe('normalizeAnswer', () => {
  it('remove acentos e caixa', () => {
    expect(normalizeAnswer('  ProgramAÇÃO  ')).toBe('programacao');
  });

  it('colapsa espaços internos', () => {
    expect(normalizeAnswer('modelo   de\tcaixa')).toBe('modelo de caixa');
  });

  it('remove pontuação final', () => {
    expect(normalizeAnswer('padding...')).toBe('padding');
    expect(normalizeAnswer('color,;')).toBe('color');
    expect(normalizeAnswer('display!?')).toBe('display');
  });

  it('junta as regras', () => {
    expect(normalizeAnswer('  BACKGROUND-COLOR,  ')).toBe('background-color');
    expect(normalizeAnswer('  É   uma   CLASSE!  ')).toBe('e uma classe');
  });
});

describe('isFillCorrect', () => {
  it('aceita qualquer resposta prevista depois da normalização', () => {
    const question = fill(['color', 'cor do texto']);

    expect(isFillCorrect(question, '  COLOR.  ')).toBe(true);
    expect(isFillCorrect(question, 'Cor do Texto!')).toBe(true);
  });

  it('rejeita resposta diferente ou vazia', () => {
    const question = fill(['padding']);

    expect(isFillCorrect(question, 'margin')).toBe(false);
    expect(isFillCorrect(question, '   ')).toBe(false);
  });
});
