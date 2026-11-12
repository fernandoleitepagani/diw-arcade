export type LevelProgress = {
  level: number;
  xpInLevel: number;
  xpForNextLevel: number;
  progress: number;
};

/** Total XP required to reach `level`, starting from level 1 at 0 XP. */
export function xpForLevel(level: number): number {
  const l = Math.max(1, Math.floor(level));
  return 100 * (l - 1) + 25 * (l - 1) * (l - 2);
}

export function levelForXp(xp: number): number {
  const total = Math.max(0, Math.floor(xp));
  let level = 1;
  while (xpForLevel(level + 1) <= total) level += 1;
  return level;
}

export function levelProgress(xp: number): LevelProgress {
  const level = levelForXp(xp);
  const levelStart = xpForLevel(level);
  const nextLevelStart = xpForLevel(level + 1);
  const xpInLevel = Math.max(0, xp - levelStart);
  const xpForNextLevel = nextLevelStart - levelStart;

  return {
    level,
    xpInLevel,
    xpForNextLevel,
    progress: xpInLevel / xpForNextLevel,
  };
}
