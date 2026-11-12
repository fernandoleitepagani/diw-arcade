import { ACHIEVEMENTS } from '../../lib/game/achievements';

export interface AchievementGridProps {
  unlocked: Readonly<Record<string, string>>;
}

function formatUnlockDate(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split('-');
  return year && month && day ? `${day}/${month}/${year}` : iso;
}

export function AchievementGrid({ unlocked }: AchievementGridProps) {
  return (
    <ul className="achievements" aria-label="Conquistas">
      {ACHIEVEMENTS.map((achievement) => {
        const unlockedAt = unlocked[achievement.id];
        const isUnlocked = typeof unlockedAt === 'string';

        return (
          <li
            className={`achievement ${
              isUnlocked ? 'achievement--unlocked' : 'achievement--locked'
            }`}
            data-locked={isUnlocked ? 'false' : 'true'}
            key={achievement.id}
          >
            <span className="achievement__icon" aria-hidden="true">
              {isUnlocked ? '★' : '☆'}
            </span>
            <span className="achievement__name">{achievement.name}</span>
            <span className="achievement__state">
              {isUnlocked
                ? `Desbloqueada em ${formatUnlockDate(unlockedAt)}`
                : 'Bloqueada'}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
