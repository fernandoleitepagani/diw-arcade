import type { CSSProperties } from 'react';
import './ProgressBar.css';

export type ProgressBarTone = 'accent' | 'xp' | 'success' | 'reward';

export interface ProgressBarProps {
  value: number;
  max?: number;
  label: string;
  tone?: ProgressBarTone;
  className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  label,
  tone = 'accent',
  className,
}: ProgressBarProps) {
  const safeMax = max > 0 ? max : 100;
  const safeValue = Math.min(Math.max(value, 0), safeMax);
  const percent = (safeValue / safeMax) * 100;
  const classes = ['ui-progress', `ui-progress--${tone}`, className]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classes}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-valuenow={safeValue}
      aria-valuetext={`${safeValue} de ${safeMax}`}
    >
      <div
        className="ui-progress__fill"
        style={{ width: `${percent}%` } as CSSProperties}
      />
    </div>
  );
}
