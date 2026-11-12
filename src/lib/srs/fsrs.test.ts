import { describe, expect, it } from 'vitest';
import {
  buildQueue,
  forecast,
  isDue,
  newCard,
  previewIntervals,
  reviewCard,
  type SrsCard,
  type QueueCaps,
} from './fsrs';

const NOW = new Date('2026-01-05T12:00:00.000Z');

function dueCard(id: string, due: Date, overrides: Partial<SrsCard> = {}): SrsCard {
  return {
    ...newCard(NOW),
    due: due.toISOString(),
    reps: 1,
    state: 2,
    lastReview: NOW.toISOString(),
    ...overrides,
  };
}

function minutesFromNow(minutes: number): Date {
  return new Date(NOW.getTime() + minutes * 60_000);
}

describe('newCard', () => {
  it('creates a New card due at the given instant', () => {
    const card = newCard(NOW);

    expect(card.state).toBe(0);
    expect(card.reps).toBe(0);
    expect(card.lapses).toBe(0);
    expect(card.lastReview).toBeNull();
    expect(card.due).toBe(NOW.toISOString());
    expect(isDue(card, NOW)).toBe(true);
  });
});

describe('reviewCard', () => {
  it('Good moves a New card out of the New state and schedules it later', () => {
    const card = newCard(NOW);
    const next = reviewCard(card, 3, NOW);

    expect(next.state).not.toBe(0);
    expect(next.reps).toBe(1);
    expect(next.lastReview).toBe(NOW.toISOString());
    expect(Date.parse(next.due)).toBeGreaterThan(NOW.getTime());
  });

  it('Again schedules sooner than Easy', () => {
    const card = newCard(NOW);
    const again = reviewCard(card, 1, NOW);
    const easy = reviewCard(card, 4, NOW);

    expect(Date.parse(again.due)).toBeLessThan(Date.parse(easy.due));
  });

  it('is deterministic for the same card, grade and instant', () => {
    const card = newCard(NOW);
    expect(reviewCard(card, 3, NOW)).toEqual(reviewCard(card, 3, NOW));
  });

  it('survives a JSON round-trip', () => {
    const reviewed = reviewCard(newCard(NOW), 3, NOW);
    const restored: SrsCard = JSON.parse(JSON.stringify(reviewed));

    expect(restored).toEqual(reviewed);
    expect(reviewCard(restored, 3, minutesFromNow(10))).toEqual(
      reviewCard(reviewed, 3, minutesFromNow(10)),
    );
  });
});

describe('previewIntervals', () => {
  it('returns four PT-BR interval strings in grade order', () => {
    const intervals = previewIntervals(newCard(NOW), NOW);

    expect(intervals).toHaveLength(4);
    for (const interval of intervals) {
      expect(typeof interval).toBe('string');
      expect(interval.length).toBeGreaterThan(0);
    }
    expect(intervals[0]).toMatch(/min/);
    expect(intervals[3]).toMatch(/dias?/);
  });
});

describe('buildQueue', () => {
  const caps: QueueCaps = {
    reviewLimit: 100,
    reviewsDoneToday: 30,
    newLimit: 20,
    newIntroducedToday: 5,
  };

  function makeDeck() {
    const cards: Record<string, SrsCard> = {};
    const deckIds: string[] = [];

    // 150 due reviews, deliberately in descending due order in the deck.
    for (let i = 0; i < 150; i += 1) {
      const id = `due-${String(i).padStart(3, '0')}`;
      deckIds.push(id);
      cards[id] = dueCard(id, minutesFromNow(-1 - i));
    }

    // 5 bulk-introduced cards (present, never reviewed).
    for (let i = 0; i < 5; i += 1) {
      const id = `intro-${i}`;
      deckIds.push(id);
      cards[id] = newCard(NOW);
    }

    // 25 unseen ids.
    for (let i = 0; i < 25; i += 1) {
      deckIds.push(`new-${String(i).padStart(2, '0')}`);
    }

    return { cards, deckIds };
  }

  it('caps due reviews at reviewLimit minus reviewsDoneToday and sorts them by due', () => {
    const { cards, deckIds } = makeDeck();
    const queue = buildQueue(deckIds, cards, NOW, caps);

    const duePart = queue.slice(0, 70);
    expect(duePart).toHaveLength(70);
    expect(duePart[0]).toBe('due-149');
    expect(duePart.at(-1)).toBe('due-080');
    expect(duePart.every((id) => id.startsWith('due-'))).toBe(true);
  });

  it('always includes every bulk-introduced card, even past the caps', () => {
    const { cards, deckIds } = makeDeck();
    const queue = buildQueue(deckIds, cards, NOW, {
      ...caps,
      newLimit: 0,
      newIntroducedToday: 0,
      reviewLimit: 0,
      reviewsDoneToday: 0,
    });

    for (let i = 0; i < 5; i += 1) {
      expect(queue).toContain(`intro-${i}`);
    }
  });

  it('caps unseen cards at newLimit minus newIntroducedToday', () => {
    const { cards, deckIds } = makeDeck();
    const queue = buildQueue(deckIds, cards, NOW, caps);

    const newPart = queue.slice(70 + 5);
    expect(newPart).toHaveLength(15);
    expect(newPart).toEqual(
      Array.from({ length: 15 }, (_, i) => `new-${String(i).padStart(2, '0')}`),
    );
  });

  it('orders the queue as due, then introduced, then unseen', () => {
    const { cards, deckIds } = makeDeck();
    const queue = buildQueue(deckIds, cards, NOW, caps);

    const firstIntro = queue.indexOf('intro-0');
    const firstNew = queue.indexOf('new-00');

    expect(queue.slice(0, 70).every((id) => id.startsWith('due-'))).toBe(true);
    expect(firstIntro).toBe(70);
    expect(firstNew).toBe(75);
  });

  it('excludes cards that are not due yet', () => {
    const cards: Record<string, SrsCard> = {
      overdue: dueCard('overdue', minutesFromNow(-60)),
      dueNow: dueCard('dueNow', NOW),
      future: dueCard('future', minutesFromNow(60 * 24)),
    };

    const queue = buildQueue(['overdue', 'dueNow', 'future'], cards, NOW, caps);

    expect(queue).toEqual(['overdue', 'dueNow']);
  });

  it('never returns a negative cap', () => {
    const cards = { card: dueCard('card', minutesFromNow(-1)) };
    const queue = buildQueue(['card', 'unseen'], cards, NOW, {
      reviewLimit: 1,
      reviewsDoneToday: 5,
      newLimit: 1,
      newIntroducedToday: 5,
    });

    expect(queue).toEqual([]);
  });
});

describe('forecast', () => {
  it('has 14 buckets and counts overdue cards in index 0', () => {
    const cards: Record<string, SrsCard> = {
      overdue: dueCard('overdue', new Date('2026-01-03T09:00:00.000Z')),
      today: dueCard('today', NOW),
      tomorrow: dueCard('tomorrow', new Date('2026-01-06T09:00:00.000Z')),
      lastDay: dueCard('lastDay', new Date('2026-01-18T09:00:00.000Z')),
      beyond: dueCard('beyond', new Date('2026-01-25T09:00:00.000Z')),
    };

    const buckets = forecast(cards, NOW, 14);

    expect(buckets).toHaveLength(14);
    expect(buckets[0]).toBe(2);
    expect(buckets[1]).toBe(1);
    expect(buckets[13]).toBe(1);
    expect(buckets.reduce((sum, count) => sum + count, 0)).toBe(4);
  });

  it('accepts an array of cards as well', () => {
    const buckets = forecast([dueCard('a', NOW), dueCard('b', minutesFromNow(-10))], NOW);

    expect(buckets).toHaveLength(14);
    expect(buckets[0]).toBe(2);
  });
});
