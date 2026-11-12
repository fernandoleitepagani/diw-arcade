export const XP = {
  quizCorrect: 10,
  quizFirstTryBonus: 5,
  cardReview: 5,
  challengePass: 30,
  hintCost: 5,
  labStep: 3,
} as const;

export function quizAnswerXp(correct: boolean, firstTry: boolean): number {
  if (!correct) return 0;
  return XP.quizCorrect + (firstTry ? XP.quizFirstTryBonus : 0);
}

export function challengePassXp(hintsUsed: number): number {
  return Math.max(0, XP.challengePass - XP.hintCost * hintsUsed);
}

export function labStepXp(alreadyAwarded: boolean): number {
  return alreadyAwarded ? 0 : XP.labStep;
}
