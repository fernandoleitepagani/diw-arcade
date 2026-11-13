import { describe, expect, it } from 'vitest';
import { newCard } from '../../lib/srs/fsrs';
import { createEmptySave } from '../../lib/storage';
import {
  DOMINADA_MIN_STABILITY,
  getCardMastery,
  getMasteryStars,
} from './masteryState';

const NOW = new Date('2026-01-05T12:00:00.000Z');

describe('getCardMastery', () => {
  it('nova when the card was never introduced or reviewed', () => {
    const save = createEmptySave(NOW);
    expect(getCardMastery(save, 'x')).toBe('nova');
    save.cards.x = newCard(NOW);
    expect(getCardMastery(save, 'x')).toBe('nova');
  });

  it('aprendendo for reviewed cards that are not yet stable', () => {
    const save = createEmptySave(NOW);
    save.cards.a = { ...newCard(NOW), reps: 2, state: 1 };
    save.cards.b = {
      ...newCard(NOW),
      reps: 5,
      state: 2,
      stability: DOMINADA_MIN_STABILITY - 0.1,
    };
    expect(getCardMastery(save, 'a')).toBe('aprendendo');
    expect(getCardMastery(save, 'b')).toBe('aprendendo');
  });

  it('dominada needs Review state and stability at the threshold', () => {
    const save = createEmptySave(NOW);
    save.cards.a = {
      ...newCard(NOW),
      reps: 5,
      state: 2,
      stability: DOMINADA_MIN_STABILITY,
    };
    save.cards.b = {
      ...newCard(NOW),
      reps: 5,
      state: 3,
      stability: DOMINADA_MIN_STABILITY * 2,
    };
    expect(getCardMastery(save, 'a')).toBe('dominada');
    expect(getCardMastery(save, 'b')).toBe('aprendendo');
  });
});

describe('getMasteryStars', () => {
  it('counts the three stars with accessible text', () => {
    expect(getMasteryStars({ quiz: true, cards: false, code: true })).toEqual({
      on: 2,
      total: 3,
      text: '2 de 3 estrelas',
    });
    expect(getMasteryStars({ quiz: false, cards: false, code: false }).text).toBe(
      '0 de 3 estrelas',
    );
    expect(getMasteryStars({ quiz: true, cards: true, code: true }).text).toBe(
      '3 de 3 estrelas',
    );
  });
});
