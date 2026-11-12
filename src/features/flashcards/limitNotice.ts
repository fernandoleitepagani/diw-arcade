import type { Flashcard } from '../../content/schema';
import { isDue, type SrsCard } from '../../lib/srs/fsrs';

/** Daily-limit banner data for the flashcard session. */
export interface LimitNotice {
  /** True when a daily limit is used up and cards are waiting for it. */
  reached: boolean;
  /** Cards today's caps let into the session. */
  shown: number;
  /** Cards competing for today: the shown ones plus those held back. */
  total: number;
}

/**
 * Tells whether the daily caps hold cards back and, if so, how many fit today.
 * Returns null when nothing is held back. `reached` means a limit is exhausted
 * (`newSlots` or `reviewSlots` is 0) with cards waiting for it; otherwise the
 * cap only trims today's session.
 */
export function getLimitNotice(
  flashcards: readonly Flashcard[],
  cards: Record<string, SrsCard>,
  now: Date,
  newSlots: number,
  reviewSlots: number,
): LimitNotice | null {
  let unseen = 0;
  let due = 0;
  let introduced = 0;

  for (const flashcard of flashcards) {
    const card = cards[flashcard.id];
    if (card === undefined) {
      unseen += 1;
    } else if (card.reps === 0) {
      introduced += 1;
    } else if (isDue(card, now)) {
      due += 1;
    }
  }

  const heldBack =
    Math.max(0, unseen - newSlots) + Math.max(0, due - reviewSlots);
  if (heldBack === 0) return null;

  const shown =
    introduced + Math.min(unseen, newSlots) + Math.min(due, reviewSlots);
  const reached =
    (unseen > 0 && newSlots === 0) || (due > 0 && reviewSlots === 0);

  return { reached, shown, total: shown + heldBack };
}
