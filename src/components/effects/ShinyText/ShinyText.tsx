import type { ReactNode } from 'react';
import { useReducedMotion } from '../../../lib/a11y/useReducedMotion';
import './ShinyText.css';

export function ShinyText({ children }: { children: ReactNode }) {
  const reducedMotion = useReducedMotion();

  return (
    <span className="shiny-text" data-motion={reducedMotion ? 'off' : 'on'}>
      {children}
    </span>
  );
}
