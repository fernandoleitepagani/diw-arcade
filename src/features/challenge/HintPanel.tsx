import { Button } from '../../components/pixel/Button/Button';
import type { HintTier } from '../../lib/progress/events';

export interface HintPanelProps {
  hints: readonly string[];
  hintsUsed: number;
  onReveal: (tier: HintTier) => void;
}

const MAX_HINTS = 3;

/**
 * Sequential hints; each tier costs XP, so only the next one is offered. The
 * whole panel is a disclosure, open by default so the next hint stays one
 * click away, and collapsible for a quieter workspace.
 */
export function HintPanel({ hints, hintsUsed, onReveal }: HintPanelProps) {
  const revealed = Math.min(MAX_HINTS, Math.max(0, hintsUsed));
  const nextTier = Math.min(MAX_HINTS, revealed + 1) as HintTier;
  const visible = hints.slice(0, revealed);

  return (
    <details className="hint-panel" open>
      <summary className="hint-panel__title">Dicas</summary>
      {visible.length > 0 ? (
        <ol className="hint-panel__list">
          {visible.map((hint, index) => (
            <li className="hint-panel__item" key={`${index}-${hint}`}>
              <span className="hint-panel__label">
                Dica {index + 1}, −5 XP
              </span>
              <p className="hint-panel__text">{hint}</p>
            </li>
          ))}
        </ol>
      ) : null}
      {revealed < MAX_HINTS ? (
        <Button variant="quiet" onClick={() => onReveal(nextTier)}>
          Ver dica {nextTier} (−5 XP)
        </Button>
      ) : (
        <p className="hint-panel__done">Todas as dicas foram usadas.</p>
      )}
    </details>
  );
}
