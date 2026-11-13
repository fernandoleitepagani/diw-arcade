import type { HTMLAttributes } from 'react';
import './PixelPanel.css';

export type PixelPanelElement = 'div' | 'section' | 'article' | 'aside';

export interface PixelPanelProps extends HTMLAttributes<HTMLDivElement> {
  as?: PixelPanelElement;
}

export function PixelPanel({
  as: Tag = 'div',
  className,
  children,
  ...rest
}: PixelPanelProps) {
  const classes = ['px', className].filter(Boolean).join(' ');

  return (
    <Tag className={classes} {...rest}>
      {children}
    </Tag>
  );
}
