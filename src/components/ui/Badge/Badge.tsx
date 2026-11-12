import type { HTMLAttributes } from 'react';
import './Badge.css';

export type BadgeTone =
  | 'neutral'
  | 'accent'
  | 'reward'
  | 'xp'
  | 'success'
  | 'danger';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export function Badge({
  tone = 'neutral',
  className,
  ...props
}: BadgeProps) {
  const classes = ['ui-badge', `ui-badge--${tone}`, className]
    .filter(Boolean)
    .join(' ');

  return <span className={classes} {...props} />;
}
