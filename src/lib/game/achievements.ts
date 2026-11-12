export type AchievementStats = {
  xpTotal: number;
  correctAnswers: number;
  perfectRounds: number;
  cardReviews: number;
  challengesPassed: number;
  noHintPasses: number;
  streak: number;
  goalDaysHit: number;
  level: number;
  completedUnits: number;
  completedNodes: number;
};

export const ACHIEVEMENTS = [
  { id: 'primeiro-passo', name: 'Primeiro passo', condition: (stats: AchievementStats) => stats.xpTotal > 0 },
  { id: 'dez-acertos', name: 'Dez acertos', condition: (stats: AchievementStats) => stats.correctAnswers >= 10 },
  { id: 'rodada-perfeita', name: 'Rodada perfeita', condition: (stats: AchievementStats) => stats.perfectRounds >= 1 },
  { id: 'memoria-50', name: 'Memória em treino', condition: (stats: AchievementStats) => stats.cardReviews >= 50 },
  {
    id: 'primeiro-desafio',
    name: 'Hello, DOM',
    condition: (stats: AchievementStats) => stats.challengesPassed >= 1,
  },
  { id: 'sem-dicas', name: 'Sem dicas', condition: (stats: AchievementStats) => stats.noHintPasses >= 1 },
  { id: 'desafios-10', name: 'Codificador', condition: (stats: AchievementStats) => stats.challengesPassed >= 10 },
  { id: 'sequencia-3', name: 'Em chamas', condition: (stats: AchievementStats) => stats.streak >= 3 },
  { id: 'sequencia-7', name: 'Semana completa', condition: (stats: AchievementStats) => stats.streak >= 7 },
  { id: 'meta-diaria', name: 'Meta batida', condition: (stats: AchievementStats) => stats.goalDaysHit >= 1 },
  { id: 'unidade-completa', name: 'Unidade dominada', condition: (stats: AchievementStats) => stats.completedUnits >= 1 },
  { id: 'arvore-completa', name: 'Árvore completa', condition: (stats: AchievementStats) => stats.completedNodes >= 14 },
] as const;

export type Achievement = (typeof ACHIEVEMENTS)[number];
export type AchievementId = Achievement['id'];

/** Ids that just qualified and are not in the save's unlocked map yet. */
export function evaluateAchievements(
  stats: AchievementStats,
  unlocked: Readonly<Record<string, string>>,
): AchievementId[] {
  return ACHIEVEMENTS.filter(
    (achievement) => !Object.hasOwn(unlocked, achievement.id) && achievement.condition(stats),
  ).map((achievement) => achievement.id);
}
