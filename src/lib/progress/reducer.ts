import { challengePassXp, labStepXp, quizAnswerXp, XP } from '../game/xp';
import { evaluateAchievements } from '../game/achievements';
import { isActiveDay, toDayKey } from '../game/days';
import { levelForXp } from '../game/level';
import { computeStreak } from '../game/streak';
import { newCard, reviewCard } from '../srs/fsrs';
import { createEmptySave } from '../storage';
import type { SaveV1 } from '../storage/schema';
import type { Outcome, ProgressContent, ProgressEvent } from './events';
import { achievementStats } from './selectors';

const MAX_REVIEWS = 5000;

type DayKey = 'quiz' | 'cards' | 'challenges' | 'labs';

function emptyDay(): SaveV1['days'][string] {
  return { xp: 0, quiz: 0, cards: 0, challenges: 0, labs: 0 };
}

function emptyChallenge(): SaveV1['challenges'][string] {
  return { passed: false, failedRuns: 0, hintsUsed: 0, xpAwarded: 0, code: null };
}

/** Copies every container the reducer may write, leaving the input intact. */
function cloneSave(save: SaveV1): SaveV1 {
  const labs: SaveV1['labs'] = {};
  for (const [labId, steps] of Object.entries(save.labs)) {
    const copy: SaveV1['labs'][string] = {};
    for (const [stepId, step] of Object.entries(steps)) {
      copy[stepId] = { ...step };
    }
    labs[labId] = copy;
  }

  return {
    ...save,
    days: { ...save.days },
    settings: { ...save.settings },
    quiz: {
      answers: { ...save.quiz.answers },
      rounds: { ...save.quiz.rounds },
    },
    cards: { ...save.cards },
    introduced: { ...save.introduced },
    reviews: [...save.reviews],
    challenges: { ...save.challenges },
    labs,
    achievements: { ...save.achievements },
    primersRead: { ...save.primersRead },
  };
}

function bumpDay(save: SaveV1, now: Date, key: DayKey): void {
  const today = toDayKey(now);
  const day = save.days[today] ?? emptyDay();
  save.days[today] = { ...day, [key]: day[key] + 1 };
}

function grantXp(save: SaveV1, now: Date, amount: number): void {
  if (amount <= 0) return;
  const today = toDayKey(now);
  const day = save.days[today] ?? emptyDay();
  save.days[today] = { ...day, xp: day.xp + amount };
  save.xpTotal += amount;
}

function activeDays(save: SaveV1): string[] {
  return Object.entries(save.days)
    .filter(([, entry]) => isActiveDay(entry))
    .map(([day]) => day);
}

function zeroOutcome(): Outcome {
  return {
    xpGained: 0,
    levelUp: null,
    achievements: [],
    streakExtended: null,
  };
}

/**
 * Common post-event work: unlock achievements that just qualified, record the
 * level-up and detect the moment a streak grows past one day.
 */
function finish(
  original: SaveV1,
  draft: SaveV1,
  now: Date,
  content: ProgressContent,
  xpGained: number,
): { save: SaveV1; outcome: Outcome } {
  const beforeLevel = levelForXp(original.xpTotal);
  const afterLevel = levelForXp(draft.xpTotal);

  const unlocked = evaluateAchievements(
    achievementStats(draft, content, now),
    draft.achievements,
  );
  for (const id of unlocked) {
    draft.achievements[id] = now.toISOString();
  }

  const today = toDayKey(now);
  const previousEntry = original.days[today];
  const currentEntry = draft.days[today];
  const wasActive = previousEntry !== undefined && isActiveDay(previousEntry);
  const isActiveNow = currentEntry !== undefined && isActiveDay(currentEntry);

  let streakExtended: number | null = null;
  if (!wasActive && isActiveNow) {
    const streak = computeStreak(activeDays(draft), now);
    if (streak >= 2) streakExtended = streak;
  }

  return {
    save: draft,
    outcome: {
      xpGained,
      levelUp: afterLevel > beforeLevel ? afterLevel : null,
      achievements: unlocked,
      streakExtended,
    },
  };
}

export function applyEvent(
  save: SaveV1,
  event: ProgressEvent,
  now: Date,
  content: ProgressContent = {},
): { save: SaveV1; outcome: Outcome } {
  if (event.type === 'save/replace') {
    return { save: event.save, outcome: zeroOutcome() };
  }

  if (event.type === 'save/reset') {
    const fresh = createEmptySave(now);
    // Erasing progress should not erase the fact that the user is past the
    // welcome screen; settings are reset with the rest of the save.
    fresh.onboarded = save.onboarded;
    return { save: fresh, outcome: zeroOutcome() };
  }

  const draft = cloneSave(save);
  let xpGained = 0;

  switch (event.type) {
    case 'primer/read': {
      draft.primersRead[event.nodeId] ??= now.toISOString();
      break;
    }

    case 'onboarding/complete': {
      draft.onboarded = true;
      if (event.dailyGoal !== undefined) {
        draft.settings = { ...draft.settings, dailyGoal: event.dailyGoal };
      }
      break;
    }

    case 'quiz/answer': {
      xpGained = quizAnswerXp(event.correct, event.firstTry);
      const previous = draft.quiz.answers[event.questionId] ?? {
        seen: 0,
        correct: 0,
        lastCorrect: false,
      };
      draft.quiz.answers[event.questionId] = {
        seen: previous.seen + 1,
        correct: previous.correct + (event.correct ? 1 : 0),
        lastCorrect: event.correct,
      };
      bumpDay(draft, now, 'quiz');
      grantXp(draft, now, xpGained);
      break;
    }

    case 'quiz/roundComplete': {
      const total = Math.max(0, event.total);
      const firstTryCorrect = Math.max(
        0,
        Math.min(event.firstTryCorrect, total > 0 ? total : event.firstTryCorrect),
      );
      const accuracy = total === 0 ? 0 : Math.round((firstTryCorrect / total) * 100);
      const previous = draft.quiz.rounds[event.nodeId] ?? {
        best: 0,
        count: 0,
        perfect: false,
      };
      draft.quiz.rounds[event.nodeId] = {
        best: Math.max(previous.best, accuracy),
        count: previous.count + 1,
        perfect: previous.perfect || (total > 0 && firstTryCorrect === total),
      };
      break;
    }

    case 'card/review': {
      xpGained = XP.cardReview;
      const today = toDayKey(now);
      const existing = draft.cards[event.cardId] ?? newCard(now);
      if (draft.introduced[event.cardId] === undefined) {
        draft.introduced[event.cardId] = today;
      }
      draft.cards[event.cardId] = reviewCard(existing, event.grade, now);
      draft.reviews.push({
        cardId: event.cardId,
        grade: event.grade,
        at: now.toISOString(),
      });
      if (draft.reviews.length > MAX_REVIEWS) {
        draft.reviews.splice(0, draft.reviews.length - MAX_REVIEWS);
      }
      bumpDay(draft, now, 'cards');
      grantXp(draft, now, xpGained);
      break;
    }

    case 'deck/introduce': {
      const today = toDayKey(now);
      for (const flashcard of content.flashcards?.[event.nodeId] ?? []) {
        if (draft.cards[flashcard.id] !== undefined) continue;
        draft.cards[flashcard.id] = newCard(now);
        draft.introduced[flashcard.id] = today;
      }
      // The whole-deck action deliberately grants no XP and is not activity.
      break;
    }

    case 'challenge/run': {
      const previous =
        draft.challenges[event.challengeId] ?? emptyChallenge();

      if (event.passed && !previous.passed) {
        xpGained = challengePassXp(previous.hintsUsed);
        draft.challenges[event.challengeId] = {
          ...previous,
          passed: true,
          xpAwarded: xpGained,
        };
        bumpDay(draft, now, 'challenges');
        grantXp(draft, now, xpGained);
      } else if (event.passed) {
        draft.challenges[event.challengeId] = { ...previous, passed: true };
      } else {
        draft.challenges[event.challengeId] = {
          ...previous,
          failedRuns: previous.failedRuns + 1,
        };
      }
      break;
    }

    case 'challenge/hint': {
      const previous =
        draft.challenges[event.challengeId] ?? emptyChallenge();
      if (event.tier !== previous.hintsUsed + 1) {
        return { save, outcome: zeroOutcome() };
      }
      draft.challenges[event.challengeId] = {
        ...previous,
        hintsUsed: event.tier,
      };
      break;
    }

    case 'challenge/saveCode': {
      const previous =
        draft.challenges[event.challengeId] ?? emptyChallenge();
      draft.challenges[event.challengeId] = { ...previous, code: event.code };
      break;
    }

    case 'lab/step': {
      const lab = draft.labs[event.labId] ?? {};
      draft.labs[event.labId] = lab;
      const previous = lab[event.stepId] ?? { done: false, xpAwarded: false };

      if (event.done) {
        xpGained = labStepXp(previous.xpAwarded);
        lab[event.stepId] = {
          done: true,
          xpAwarded: previous.xpAwarded || xpGained > 0,
        };
        bumpDay(draft, now, 'labs');
        grantXp(draft, now, xpGained);
      } else {
        lab[event.stepId] = { done: false, xpAwarded: previous.xpAwarded };
      }
      break;
    }

    case 'settings/update': {
      draft.settings = { ...draft.settings, ...event.patch };
      break;
    }
  }

  return finish(save, draft, now, content, xpGained);
}
