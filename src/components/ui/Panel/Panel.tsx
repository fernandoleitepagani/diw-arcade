import type { HTMLAttributes } from 'react';
import './Panel.css';

export type PanelTone = 'default' | 'accent' | 'reward' | 'xp';
export type PanelElement = 'div' | 'section' | 'article' | 'aside';

export interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  as?: PanelElement;
  tone?: PanelTone;
}

export function Panel({
  as: Tag = 'div',
  tone = 'default',
  className,
  ...props
}: PanelProps) {
  const classes = ['ui-panel', `ui-panel--${tone}`, className]
    .filter(Boolean)
    .join(' ');

  return <Tag className={classes} {...props} />;
}
