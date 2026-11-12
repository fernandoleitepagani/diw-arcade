import type { FillQuestion } from '../../content/schema';

/**
 * Fill answers are forgiving about the things a student should not have to
 * think about: accents, case, stray spaces and sentence punctuation.
 */
export function normalizeAnswer(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.,;:!?…]+$/u, '')
    .trim();
}

export function isFillCorrect(
  question: Pick<FillQuestion, 'answers'>,
  value: string,
): boolean {
  const normalized = normalizeAnswer(value);
  if (normalized.length === 0) return false;
  return question.answers.some(
    (candidate) => normalizeAnswer(candidate) === normalized,
  );
}
