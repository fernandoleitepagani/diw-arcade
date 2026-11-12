import { useEffect, useRef } from 'react';
import { Confetti } from '../motion';
import { useToast } from '../ui';

export interface UnitCelebrationProps {
  title: string;
  /** Increment on every new completed unit to fire one more confetti burst. */
  fire: number;
}

/**
 * Announces a completed unit and lets the confetti effect run once per burst.
 * The toast owns the announcement; confetti is decorative and stays static
 * when reduced motion is requested.
 */
export function UnitCelebration({ title, fire }: UnitCelebrationProps) {
  const { showToast } = useToast();
  const announced = useRef<number | null>(null);

  useEffect(() => {
    if (announced.current === fire) return;
    announced.current = fire;
    showToast(`Unidade concluída: ${title}`, {
      tone: 'success',
      duration: 6_000,
    });
  }, [fire, showToast, title]);

  return <Confetti fire={fire} />;
}
