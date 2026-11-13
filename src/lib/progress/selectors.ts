import { NODES, NODE_IDS, UNITS, type LabId, type NodeId } from '../../content/tree';
import type { AchievementStats } from '../game/achievements';
import { isActiveDay, toDayKey } from '../game/days';
import { levelForXp, levelProgress, type LevelProgress } from '../game/level';
import { computeStreak, longestStreak } from '../game/streak';
import { isDue, forecast } from '../srs/fsrs';
import type { SaveV1 } from '../storage/schema';
import type { ProgressContent } from './events';

/** Quiz star: the best round reached this first-try percentage. */
export const QUIZ_STAR_PERCENT = 80;

/** Cards star: at least this share of the deck must be in the Review state. */
export const CARD_STAR_RATIO = 0.8;

export interface Stars {
  quiz: boolean;
  cards: boolean;
  code: boolean;
}

export interface LabProgress {
  done: number;
  total: number;
}

function activeDayKeys(save: SaveV1): string[] {
  return Object.entries(save.days)
    .filter(([, entry]) => isActiveDay(entry))
    .map(([day]) => day);
}

export function isPrimerRead(save: SaveV1, nodeId: NodeId): boolean {
  return nodeId in save.primersRead;
}

export function getPrimersRead(save: SaveV1): Set<string> {
  return new Set(Object.keys(save.primersRead));
}

export function getLevel(save: SaveV1): number {
  return levelForXp(save.xpTotal);
}

export function getLevelProgress(save: SaveV1): LevelProgress {
  return levelProgress(save.xpTotal);
}

export function getTodayXp(save: SaveV1, now: Date): number {
  return save.days[toDayKey(now)]?.xp ?? 0;
}

export function getStreak(save: SaveV1, now: Date): number {
  return computeStreak(activeDayKeys(save), now);
}

export function getLongestStreak(save: SaveV1): number {
  return longestStreak(activeDayKeys(save));
}

export function getStars(
  save: SaveV1,
  nodeId: NodeId,
  content?: ProgressContent,
): Stars;
export function getStars(
  nodeId: NodeId,
  save: SaveV1,
  content?: ProgressContent,
): Stars;
export function getStars(
  first: SaveV1 | NodeId,
  second: SaveV1 | NodeId,
  content: ProgressContent = {},
): Stars {
  const save = typeof first === 'string' ? (second as SaveV1) : first;
  const nodeId = typeof first === 'string' ? first : (second as NodeId);
  const questions = content.questions?.[nodeId] ?? [];
  const flashcards = content.flashcards?.[nodeId] ?? [];
  const challenges = content.challenges?.[nodeId] ?? [];

  const best = save.quiz.rounds[nodeId]?.best ?? 0;
  // Rounds are stored as a 0–100 percentage; older/hand-written saves may carry
  // the 0–1 ratio described in the spec, so accept both representations.
  const quiz =
    questions.length > 0 &&
    (best > 1 ? best >= QUIZ_STAR_PERCENT : best >= QUIZ_STAR_PERCENT / 100);

  let cards = false;
  if (flashcards.length > 0) {
    let reviewed = 0;
    let inReview = 0;
    for (const flashcard of flashcards) {
      const card = save.cards[flashcard.id];
      if (card && card.reps > 0) {
        reviewed += 1;
        if (card.state === 2) inReview += 1;
      }
    }
    cards =
      reviewed === flashcards.length &&
      inReview / flashcards.length >= CARD_STAR_RATIO;
  }

  const code =
    challenges.length > 0 &&
    challenges.every((challenge) => save.challenges[challenge.id]?.passed === true);

  return { quiz, cards, code };
}

export function getStarCount(stars: Stars): number {
  return Number(stars.quiz) + Number(stars.cards) + Number(stars.code);
}

function isNodeId(value: string): value is NodeId {
  return (NODE_IDS as readonly string[]).includes(value);
}

function nodeIdForCardId(
  cardId: string,
  content: ProgressContent,
): NodeId | null {
  for (const nodeId of NODE_IDS) {
    if ((content.flashcards?.[nodeId] ?? []).some((card) => card.id === cardId)) {
      return nodeId;
    }
  }
  const prefix = /^(n\d{2})-/.exec(cardId)?.[1];
  return prefix !== undefined && isNodeId(prefix) ? prefix : null;
}

/** Due cards per node, counting cards that exist in the save. */
export function getDueCountByNode(
  save: SaveV1,
  content: ProgressContent = {},
  now: Date = new Date(),
): Record<NodeId, number> {
  const counts = Object.fromEntries(NODE_IDS.map((id) => [id, 0])) as Record<
    NodeId,
    number
  >;

  for (const [cardId, card] of Object.entries(save.cards)) {
    if (!isDue(card, now)) continue;
    const nodeId = nodeIdForCardId(cardId, content);
    if (nodeId !== null) counts[nodeId] += 1;
  }

  return counts;
}

/** First-try accuracy percentage, or null when nothing has been seen. */
export function getNodeQuizAccuracy(
  save: SaveV1,
  nodeId: NodeId,
  content?: ProgressContent,
): number | null {
  const questions = content?.questions?.[nodeId];
  if (questions && questions.length > 0) {
    let seen = 0;
    let correct = 0;
    for (const question of questions) {
      const answer = save.quiz.answers[question.id];
      if (!answer) continue;
      seen += answer.seen;
      correct += answer.correct;
    }
    return seen === 0 ? null : Math.round((correct / seen) * 100);
  }

  const round = save.quiz.rounds[nodeId];
  return round && round.count > 0 ? round.best : null;
}

/** Share of a node's reviewed cards sitting in the Review state, in percent. */
export function getCardRetention(
  save: SaveV1,
  nodeId: NodeId,
  content: ProgressContent = {},
): number | null {
  const flashcards = content.flashcards?.[nodeId] ?? [];
  if (flashcards.length === 0) return null;

  let reviewed = 0;
  let inReview = 0;
  for (const flashcard of flashcards) {
    const card = save.cards[flashcard.id];
    if (!card || card.reps === 0) continue;
    reviewed += 1;
    if (card.state === 2) inReview += 1;
  }

  return reviewed === 0 ? null : Math.round((inReview / reviewed) * 100);
}

/** Share of a node's challenges that have passed, in percent. */
export function getChallengeCompletion(
  save: SaveV1,
  nodeId: NodeId,
  content: ProgressContent = {},
): number | null {
  const listed = content.challenges?.[nodeId];
  const ids = listed
    ? listed.map((challenge) => challenge.id)
    : Object.keys(save.challenges).filter((id) => id.startsWith(`${nodeId}-`));

  if (ids.length === 0) return null;

  const passed = ids.filter((id) => save.challenges[id]?.passed === true).length;
  return Math.round((passed / ids.length) * 100);
}

/** Cards whose `introduced` day is today. */
export function getNewIntroducedToday(save: SaveV1, now: Date): number {
  const today = toDayKey(now);
  return Object.values(save.introduced).filter((day) => day === today).length;
}

/**
 * Reviews done today, excluding cards introduced today (they spend the new-card
 * allowance instead of the review allowance).
 */
export function getReviewsDoneToday(save: SaveV1, now: Date): number {
  const today = toDayKey(now);
  return save.reviews.filter((review) => {
    const reviewDay = toDayKey(new Date(review.at));
    return reviewDay === today && save.introduced[review.cardId] !== today;
  }).length;
}

export function getForecast(
  save: SaveV1,
  now: Date = new Date(),
  days = 14,
): number[] {
  return forecast(save.cards, now, days);
}

export function isSolutionUnlocked(
  save: SaveV1,
  challengeId: string,
): boolean {
  const progress = save.challenges[challengeId];
  return progress !== undefined && (progress.failedRuns >= 3 || progress.passed);
}

/**
 * Lab checklist progress. The total can come from a guide (or its step count);
 * without one, the recorded steps are the best available denominator.
 */
export function getLabProgress(
  save: SaveV1,
  labId: LabId,
  source?: number | ProgressContent | { steps: readonly unknown[] },
): LabProgress {
  const steps = save.labs[labId] ?? {};
  const done = Object.values(steps).filter((step) => step.done).length;

  let total: number | undefined;
  if (typeof source === 'number') {
    total = source;
  } else if (source && 'steps' in source && Array.isArray(source.steps)) {
    total = source.steps.length;
  } else if (source) {
    total = (source as ProgressContent).labs?.[labId]?.steps.length;
  }

  return { done, total: total ?? Object.keys(steps).length };
}

/** Everything the 12 achievements need, derived from the save. */
export function achievementStats(
  save: SaveV1,
  content: ProgressContent = {},
  now: Date = new Date(),
): AchievementStats {
  const correctAnswers = Object.values(save.quiz.answers).reduce(
    (sum, answer) => sum + answer.correct,
    0,
  );
  const perfectRounds = Object.values(save.quiz.rounds).filter(
    (round) => round.perfect,
  ).length;
  const challenges = Object.values(save.challenges);
  const challengesPassed = challenges.filter((challenge) => challenge.passed).length;
  const noHintPasses = challenges.filter(
    (challenge) => challenge.passed && challenge.hintsUsed === 0,
  ).length;
  const goalDaysHit = Object.values(save.days).filter(
    (day) => day.xp >= save.settings.dailyGoal,
  ).length;

  let completedNodes = 0;
  for (const node of NODES) {
    if (getStarCount(getStars(save, node.id, content)) === 3) completedNodes += 1;
  }

  let completedUnits = 0;
  for (const unit of UNITS) {
    if (
      unit.nodes.every(
        (nodeId) => getStarCount(getStars(save, nodeId, content)) === 3,
      )
    ) {
      completedUnits += 1;
    }
  }

  return {
    xpTotal: save.xpTotal,
    correctAnswers,
    perfectRounds,
    cardReviews: save.reviews.length,
    challengesPassed,
    noHintPasses,
    streak: getStreak(save, now),
    goalDaysHit,
    level: levelForXp(save.xpTotal),
    completedUnits,
    completedNodes,
  };
}

/** Revision log size kept by the reducer; also the payoff for achievements. */
export function getReviewCount(save: SaveV1): number {
  return save.reviews.length;
}
