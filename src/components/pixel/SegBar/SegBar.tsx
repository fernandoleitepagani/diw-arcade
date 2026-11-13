import type { CSSProperties } from 'react';
import './SegBar.css';

export interface SegBarProps {
  on: number;
  total: number;
  color?: string;
  size?: 'sm';
  label?: string;
}

export function SegBar({ on, total, color, size, label }: SegBarProps) {
  const classes = ['seg', size === 'sm' && 'sm'].filter(Boolean).join(' ');
  const style = color ? ({ '--c': color } as CSSProperties) : undefined;
  const a11y = label
    ? {
        role: 'progressbar',
        'aria-label': label,
        'aria-valuenow': on,
        'aria-valuemin': 0,
        'aria-valuemax': total,
      }
    : { 'aria-hidden': true };

  return (
    <div className={classes} style={style} {...a11y}>
      {Array.from({ length: total }, (_, index) => (
        <i key={index} className={index < on ? undefined : 'off'} />
      ))}
    </div>
  );
}
