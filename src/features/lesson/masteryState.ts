import type { Stars } from '../../lib/progress/selectors';
import type { SaveV1 } from '../../lib/storage/schema';

/**
 * A card counts as "dominada" once it is in the FSRS Review state and its
 * memory stability (days until recall drops to the target retention) is at
 * least this many days. Display only; it does not feed SRS or XP.
 */
export const DOMINADA_MIN_STABILITY = 21;

export type CardMastery = 'nova' | 'aprendendo' | 'dominada';

export function getCardMastery(save: SaveV1, cardId: string): CardMastery {
  const card = save.cards[cardId];
  if (!card || card.reps === 0) return 'nova';
  if (card.state === 2 && card.stability >= DOMINADA_MIN_STABILITY) {
    return 'dominada';
  }
  return 'aprendendo';
}

export interface MasteryStars {
  on: number;
  total: number;
  text: string;
}

export function getMasteryStars(stars: Stars): MasteryStars {
  const on = Number(stars.quiz) + Number(stars.cards) + Number(stars.code);
  return { on, total: 3, text: `${on} de 3 pontos de domínio` };
}
