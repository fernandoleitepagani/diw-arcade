import { useReducedMotion } from './useReducedMotion';

/**
 * Whether motion is available: a real `matchMedia` exists and the user has not
 * asked for reduced motion. jsdom lacks `matchMedia`, so tests see final states.
 */
export function useMotionAllowed(): boolean {
  const reducedMotion = useReducedMotion();

  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    !reducedMotion
  );
}
