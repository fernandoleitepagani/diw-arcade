import { useReducedMotion } from '../../../lib/a11y/useReducedMotion';
import './Aurora.css';

export function Aurora() {
  const reducedMotion = useReducedMotion();

  return (
    <div
      className="aurora"
      aria-hidden="true"
      data-motion={reducedMotion ? 'off' : 'on'}
    >
      <span className="aurora__blob aurora__blob--cyan" />
      <span className="aurora__blob aurora__blob--magenta" />
    </div>
  );
}
