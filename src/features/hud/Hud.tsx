import { Component, type ReactNode } from "react";
import { useProgress } from "../../app/ProgressProvider";
import { PixelSprite } from "../../components/pixel/PixelSprite/PixelSprite";
import { SegBar } from "../../components/pixel/SegBar/SegBar";
import {
  getLevelProgress,
  getStreak,
  getTodayXp,
} from "../../lib/progress/selectors";
import "./Hud.css";

const FLAME_ROWS = [
  "...X....",
  "...XX...",
  "..XXX.X.",
  ".XXXXXX.",
  ".XXYXXX.",
  "XXXYYXXX",
  ".XXYYXX.",
  "..XXXX..",
] as const;
const FLAME_PALETTE = { X: "var(--u-html)", Y: "var(--u-js)" };

const COIN_ROWS = [
  "..XXXX..",
  ".XXXXXX.",
  "XXXYYXXX",
  "XXXYYXXX",
  "XXXYYXXX",
  "XXXYYXXX",
  ".XXXXXX.",
  "..XXXX..",
] as const;
const COIN_PALETTE = { X: "var(--u-js)", Y: "var(--coin-in)" };

const LEVEL_SEGMENTS = 10;

function HudContent() {
  const { save, now } = useProgress();
  const level = getLevelProgress(save);
  const streak = getStreak(save, now);
  const todayXp = getTodayXp(save, now);
  const goal = save.settings.dailyGoal;
  const goalMet = todayXp >= goal;
  const segments = Math.round(
    Math.min(1, level.xpInLevel / level.xpForNextLevel) * LEVEL_SEGMENTS,
  );

  return (
    <aside className="hud" aria-label="Status do jogador">
      <span className="hud__level">nível {level.level}</span>

      <SegBar
        on={segments}
        total={LEVEL_SEGMENTS}
        size="sm"
        label={`${level.xpInLevel} de ${level.xpForNextLevel} XP no nível`}
      />

      <span
        className="hud__chip"
        aria-label={
          streak === 1 ? "Sequência de 1 dia" : `Sequência de ${streak} dias`
        }
      >
        <PixelSprite rows={FLAME_ROWS} palette={FLAME_PALETTE} scale={2} />
        {streak}
      </span>

      <span
        className={
          goalMet
            ? "hud__chip hud__today hud__today--met"
            : "hud__chip hud__today"
        }
        data-met={goalMet ? "true" : "false"}
      >
        <PixelSprite rows={COIN_ROWS} palette={COIN_PALETTE} scale={2} />
        <span>
          {todayXp}/{goal}
        </span>
        <span className="sr-only">
          {" "}
          XP hoje{goalMet ? ", meta cumprida" : ""}
        </span>
      </span>
    </aside>
  );
}

/**
 * The HUD is decorative chrome around the routed pages. If it is ever mounted
 * without the progress provider (as the shell routes test does), it simply
 * stays hidden instead of taking the whole app down.
 */
class HudBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
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
