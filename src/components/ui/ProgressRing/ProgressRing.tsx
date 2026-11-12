import type { ReactNode } from 'react';
import './ProgressRing.css';

export type ProgressRingTone = 'accent' | 'xp' | 'reward' | 'success';

export interface ProgressRingProps {
  value: number;
  max: number;
  label: string;
  size?: number;
  stroke?: number;
  tone?: ProgressRingTone;
  className?: string;
  children?: ReactNode;
}

export function ProgressRing({
  value,
  max,
  label,
  size = 48,
  stroke = 6,
  tone = 'accent',
  className,
  children,
}: ProgressRingProps) {
  const safeMax = max > 0 ? max : 100;
  const safeValue = Math.min(Math.max(value, 0), safeMax);
  const radius = Math.max(0, (size - stroke) / 2);
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - safeValue / safeMax);
  const center = size / 2;
  const classes = ['ui-ring', `ui-ring--${tone}`, className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} style={{ width: size, height: size }}>
      <svg
        className="ui-ring__svg"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={safeValue}
        aria-valuetext={`${safeValue} de ${safeMax}`}
        focusable="false"
      >
        <circle
          className="ui-ring__track"
          cx={center}
          cy={center}
          r={radius}
          strokeWidth={stroke}
        />
        <circle
          className="ui-ring__fill"
          cx={center}
          cy={center}
          r={radius}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      {children ? <span className="ui-ring__content">{children}</span> : null}
    </div>
  );
}
