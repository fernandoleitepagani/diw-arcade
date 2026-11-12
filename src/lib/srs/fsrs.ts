import { createEmptyCard, fsrs, generatorParameters, type Card } from 'ts-fsrs';

/** Grades in the order the flashcards UI exposes them: De novo, Difícil, Bom, Fácil. */
export type Grade = 1 | 2 | 3 | 4;

/** Numeric ts-fsrs states: New, Learning, Review, Relearning. */
export type SrsState = 0 | 1 | 2 | 3;

/** Persisted scheduler card. Dates are ISO strings so the save survives JSON. */
export interface SrsCard {
  due: string;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  state: SrsState;
  lastReview: string | null;
}

/** Queue caps derived from the user settings and today's activity. */
export interface QueueCaps {
  newLimit: number;
  newIntroducedToday: number;
  reviewLimit: number;
  reviewsDoneToday: number;
}

/** PT-BR labels for the four grades. */
export const GRADE_LABELS: Readonly<Record<Grade, string>> = {
  1: 'De novo',
  2: 'Difícil',
  3: 'Bom',
  4: 'Fácil',
};

/** Grades in display order. */
export const GRADES: readonly Grade[] = [1, 2, 3, 4];

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/**
 * Desktop-only, deterministic scheduler: no fuzz, 90% requested retention.
 * A single instance is reused so every call produces identical results.
 */
const scheduler = fsrs(
  generatorParameters({ enable_fuzz: false, request_retention: 0.9 }),
);

function toState(state: number): SrsState {
  return state === 1 || state === 2 || state === 3 ? state : 0;
}

function elapsedDaysSince(lastReview: Date | undefined, now: Date): number {
  if (!lastReview) return 0;
  return Math.max(0, Math.floor((now.getTime() - lastReview.getTime()) / DAY_MS));
}

/** Maps a persisted `SrsCard` to the shape ts-fsrs schedules. */
export function toFsrsCard(card: SrsCard): Card {
  return {
    due: new Date(card.due),
    stability: card.stability,
    difficulty: card.difficulty,
    scheduled_days: card.scheduledDays,
    learning_steps: card.learningSteps,
    reps: card.reps,
    lapses: card.lapses,
    state: toState(card.state) as Card['state'],
    last_review: card.lastReview ? new Date(card.lastReview) : undefined,
  };
}

/** Maps a ts-fsrs `Card` back to the persisted `SrsCard`. */
export function fromFsrsCard(card: Card, now: Date): SrsCard {
  return {
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: elapsedDaysSince(card.last_review, now),
    scheduledDays: card.scheduled_days,
    learningSteps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: toState(card.state),
    lastReview: card.last_review ? card.last_review.toISOString() : null,
  };
}

/** A brand-new card, due immediately and never reviewed. */
export function newCard(now: Date = new Date()): SrsCard {
  return fromFsrsCard(createEmptyCard(now), now);
}

/** Applies a grade at `now` and returns the next persisted card. */
export function reviewCard(card: SrsCard, grade: Grade, now: Date = new Date()): SrsCard {
  const result = scheduler.next(toFsrsCard(card), now, grade);
  return fromFsrsCard(result.card, now);
}

/** True when the card is due at or before `now`. */
export function isDue(card: SrsCard, now: Date = new Date()): boolean {
  return Date.parse(card.due) <= now.getTime();
}

function formatMinutes(totalMinutes: number): string {
  const minutes = Math.max(0, Math.round(totalMinutes));
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.round(minutes / 60);
  if (minutes < 24 * 60) return `${hours} h`;

  const days = Math.round(minutes / (24 * 60));
  if (days < 30) return `${days} ${days === 1 ? 'dia' : 'dias'}`;

  const months = Math.round(days / 30);
  if (months < 12) return `${months} ${months === 1 ? 'mês' : 'meses'}`;

  const years = Math.round(months / 12);
  return `${years} ${years === 1 ? 'ano' : 'anos'}`;
}

/**
 * The four next-due labels for De novo, Difícil, Bom and Fácil, always in that
 * order. Used by the flashcards grading buttons and keyboard hints.
 */
export function previewIntervals(card: SrsCard, now: Date = new Date()): string[] {
  const preview = scheduler.repeat(toFsrsCard(card), now);
  return GRADES.map((grade) => {
    const item = preview[grade];
    return formatMinutes((item.card.due.getTime() - now.getTime()) / MINUTE_MS);
  });
}

function startOfDay(date: Date): number {
  const copy = new Date(date.getTime());
  copy.setHours(0, 0, 0, 0);
  return copy.getTime();
}

function cardValues(cards: Record<string, SrsCard> | readonly SrsCard[]): SrsCard[] {
  return Array.isArray(cards) ? [...cards] : Object.values(cards);
}

/**
 * Counts due cards per day for the next `days` days. Index 0 is today and also
 * absorbs everything already overdue; cards past the window are ignored.
 */
export function forecast(
  cards: Record<string, SrsCard> | readonly SrsCard[],
  now: Date = new Date(),
  days = 14,
): number[] {
  const counts = new Array<number>(Math.max(0, days)).fill(0);
  if (counts.length === 0) return counts;

  const today = startOfDay(now);

  for (const card of cardValues(cards)) {
    const dueAt = Date.parse(card.due);
    if (Number.isNaN(dueAt)) continue;

    const dueDay = startOfDay(new Date(dueAt));
    const offset = Math.round((dueDay - today) / DAY_MS);
    if (offset < 0) {
      counts[0] = (counts[0] ?? 0) + 1;
    } else if (offset < counts.length) {
      counts[offset] = (counts[offset] ?? 0) + 1;
    }
  }

  return counts;
}

function capRemaining(limit: number, done: number): number {
  return Math.max(0, limit - done);
}

/**
 * Three-part daily queue over the cards of `deckIds`:
 * 1. due reviews (`reps >= 1`), soonest first, limited by the review cap;
 * 2. bulk-introduced cards (`reps === 0`), in content order, uncapped;
 * 3. unseen ids, in content order, limited by the new-card cap.
 */
export function buildQueue(
  deckIds: readonly string[],
  cards: Record<string, SrsCard>,
  now: Date,
  caps: QueueCaps,
): string[] {
  const dueSlots = capRemaining(caps.reviewLimit, caps.reviewsDoneToday);
  const newSlots = capRemaining(caps.newLimit, caps.newIntroducedToday);

  const due: { id: string; due: number }[] = [];
  const introduced: string[] = [];
  const unseen: string[] = [];

  for (const id of deckIds) {
    const card = cards[id];
    if (!card) {
      unseen.push(id);
    } else if (card.reps === 0) {
      introduced.push(id);
    } else if (isDue(card, now)) {
      due.push({ id, due: Date.parse(card.due) });
    }
  }

  due.sort((a, b) => a.due - b.due);

  return [
    ...due.slice(0, dueSlots).map((entry) => entry.id),
    ...introduced,
    ...unseen.slice(0, newSlots),
  ];
}
