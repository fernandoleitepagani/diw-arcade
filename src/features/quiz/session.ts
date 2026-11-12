import type { Question } from '../../content/schema';

export interface AnswerStats {
  seen: number;
  correct: number;
  lastCorrect: boolean;
}

export type QuizAnswers = Readonly<Record<string, AnswerStats>>;

function accuracy(stats: AnswerStats | undefined): number {
  if (!stats || stats.seen === 0) return 0;
  return stats.correct / stats.seen;
}

function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    const current = copy[index];
    const other = copy[swapIndex];
    if (current === undefined || other === undefined) continue;
    copy[index] = other;
    copy[swapIndex] = current;
  }

  return copy;
}

/**
 * Builds one round: unseen questions come first, then the ones with the
 * lowest hit rate fill the remaining slots. The selected set is shuffled so
 * the same priority does not always produce the same order.
 */
export function pickRound(
  questions: readonly Question[],
  answers: QuizAnswers,
  rng: () => number,
  size = 10,
): Question[] {
  if (size <= 0) return [];

  const unseen = questions.filter((question) => answers[question.id] === undefined);
  const seen = questions
    .filter((question) => answers[question.id] !== undefined)
    .sort(
      (first, second) =>
        accuracy(answers[first.id]) - accuracy(answers[second.id]),
    );

  return shuffle([...unseen, ...seen].slice(0, size), rng);
}

export interface QuizSession {
  /** Remaining questions; the current question is the first one. */
  readonly queue: readonly Question[];
  /** Unique questions in the round, used as the "de N" denominator. */
  readonly total: number;
  /** Questions already served at least once. */
  readonly asked: ReadonlySet<string>;
  /** Question ids answered correctly on their first attempt. */
  readonly firstTry: ReadonlySet<string>;
}

export interface AnswerResult {
  session: QuizSession;
  /** True only when this answer was correct on the question's first attempt. */
  firstTry: boolean;
  done: boolean;
}

export function startSession(questions: readonly Question[]): QuizSession {
  return {
    queue: [...questions],
    total: questions.length,
    asked: new Set(),
    firstTry: new Set(),
  };
}

export function currentQuestion(session: QuizSession): Question | undefined {
  return session.queue[0];
}

export function isComplete(session: QuizSession): boolean {
  return session.queue.length === 0;
}

export function firstTryCount(session: QuizSession): number {
  return session.firstTry.size;
}

/**
 * Position shown as "Questão k de N". A question only advances the counter
 * the first time it is served; requeued questions keep the round at N.
 */
export function questionNumber(session: QuizSession): number {
  const current = currentQuestion(session);
  if (!current) return session.total;
  const alreadyAsked = session.asked.has(current.id);
  return Math.min(
    session.total,
    session.asked.size + (alreadyAsked ? 0 : 1),
  );
}

export function answer(session: QuizSession, correct: boolean): AnswerResult {
  const current = currentQuestion(session);
  if (!current) {
    return { session, firstTry: false, done: true };
  }

  const firstAttempt = !session.asked.has(current.id);
  const asked = new Set(session.asked);
  asked.add(current.id);

  const firstTry = new Set(session.firstTry);
  if (correct && firstAttempt) firstTry.add(current.id);

  const rest = session.queue.slice(1);
  const queue = correct ? rest : [...rest, current];

  return {
    session: { ...session, queue, asked, firstTry },
    firstTry: correct && firstAttempt,
    done: queue.length === 0,
  };
}
