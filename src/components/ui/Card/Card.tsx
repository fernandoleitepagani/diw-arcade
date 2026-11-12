import type { HTMLAttributes } from 'react';
import './Card.css';

export type CardElement = 'div' | 'section' | 'article';
export type CardTone = 'default' | 'accent' | 'reward' | 'xp' | 'success';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  as?: CardElement;
  interactive?: boolean;
  tone?: CardTone;
}

export function Card({
  as: Tag = 'div',
  interactive = false,
  tone = 'default',
  className,
  ...props
}: CardProps) {
  const classes = [
    'ui-card',
    `ui-card--${tone}`,
    interactive ? 'ui-card--interactive' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return <Tag className={classes} {...props} />;
}
