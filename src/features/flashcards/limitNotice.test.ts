import { describe, expect, it } from 'vitest';
import type { Flashcard } from '../../content/schema';
import { getLimitNotice } from './limitNotice';

const NOW = new Date('2026-01-05T12:00:00.000Z');

function makeFlashcard(index: number): Flashcard {
  const suffix = String(index).padStart(3, '0');
  return {
    id: `n07-f${suffix}`,
    nodeId: 'n07',
    front: `Pergunta ${index}?`,
    back: `Resposta ${index}.`,
    source: { aula: 172, slide: 2 },
    evidence: 'Evidência de teste com mais de vinte caracteres.',
  };
}

function deck(count: number): Flashcard[] {
  return Array.from({ length: count }, (_, index) => makeFlashcard(index + 1));
}

describe('getLimitNotice', () => {
  it('is null when the caps hold nothing back', () => {
    expect(getLimitNotice(deck(3), {}, NOW, 3, 0)).toBeNull();
  });

  it('reports a trimmed session with the queued and available counts', () => {
    expect(getLimitNotice(deck(25), {}, NOW, 20, 0)).toEqual({
      reached: false,
      shown: 20,
      total: 25,
    });
  });

  it('reports a reached limit when the allowance is exhausted', () => {
    expect(getLimitNotice(deck(5), {}, NOW, 0, 0)).toEqual({
      reached: true,
      shown: 0,
      total: 5,
    });
  });
});
