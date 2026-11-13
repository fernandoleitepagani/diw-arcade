import { Component, type ReactNode } from 'react';
import { useProgress } from '../../app/ProgressProvider';
import {
  getLevelProgress,
  getStreak,
  getTodayXp,
} from '../../lib/progress/selectors';
import './Hud.css';

function FlameIcon() {
  return (
    <svg
      className="hud__flame"
      viewBox="0 0 9 9"
      aria-hidden="true"
      focusable="false"
      shapeRendering="crispEdges"
    >
      <g fill="currentColor">
        <rect x="4" y="0" width="1" height="1" />
        <rect x="3" y="1" width="2" height="2" />
        <rect x="2" y="2" width="1" height="4" />
        <rect x="5" y="2" width="1" height="1" />
        <rect x="3" y="3" width="3" height="4" />
        <rect x="6" y="4" width="1" height="3" />
        <rect x="2" y="6" width="5" height="1" />
        <rect x="3" y="7" width="3" height="1" />
      </g>
      <g fill="var(--xp)">
        <rect x="4" y="2" width="1" height="2" />
        <rect x="3" y="4" width="2" height="3" />
        <rect x="4" y="7" width="1" height="1" />
      </g>
    </svg>
  );
}

function HudContent() {
  const { save, now } = useProgress();
  const level = getLevelProgress(save);
  const streak = getStreak(save, now);
  const todayXp = getTodayXp(save, now);
  const goal = save.settings.dailyGoal;
  const goalMet = todayXp >= goal;

  return (
    <aside className="hud" aria-label="Status do jogador">
      <span className="hud__level">Nv {level.level}</span>

      <span className="hud__xp">
        {level.xpInLevel}/{level.xpForNextLevel} XP
      </span>

      <span className="hud__streak">
        <FlameIcon />
        <span>{streak === 1 ? '1 dia' : `${streak} dias`}</span>
      </span>

      <span
        className={goalMet ? 'hud__today hud__today--met' : 'hud__today'}
        data-met={goalMet ? 'true' : 'false'}
      >
        <span className="hud__today-value">
          {todayXp}/{goal} XP hoje
        </span>
        {goalMet ? (
          <span className="hud__today-check" aria-hidden="true">
            ✓
          </span>
        ) : null}
      </span>
    </aside>
  );
}

/**
 * The HUD is decorative chrome around the routed pages. If it is ever mounted
 * without the progress provider (as the shell routes test does), it simply
 * stays hidden instead of taking the whole app down.
 */
class HudBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function Hud() {
  return (
    <HudBoundary>
      <HudContent />
    </HudBoundary>
  );
}
