import type { CSSProperties } from 'react';
import { useMotionAllowed } from '../../lib/a11y/useMotionAllowed';
import './Confetti.css';

const PIECE_COUNT = 24;
const COLORS = ['var(--accent)', 'var(--reward)', 'var(--xp)', 'var(--success)'];

export interface ConfettiProps {
  /** Increment to fire another burst. */
  fire: number;
}

export function Confetti({ fire }: ConfettiProps) {
  const motionAllowed = useMotionAllowed();

  if (!motionAllowed || fire <= 0) return null;

  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: PIECE_COUNT }, (_, index) => {
        const angle = (index / PIECE_COUNT) * Math.PI * 2;
        const distance = 70 + (index % 5) * 26;
        const x = Math.round(Math.cos(angle) * distance);
        const y = Math.round(Math.sin(angle) * distance * 0.75 + 80);
        const rotate = (index % 2 === 0 ? 1 : -1) * (180 + index * 15);
        const delay = (index % 6) * 20;
        const color = COLORS[index % COLORS.length] ?? 'var(--accent)';

        return (
          <span
            key={`${fire}-${index}`}
            className="confetti__piece"
            style={
              {
                '--confetti-x': `${x}px`,
                '--confetti-y': `${y}px`,
                '--confetti-rotate': `${rotate}deg`,
                '--confetti-delay': `${delay}ms`,
                '--confetti-color': color,
              } as CSSProperties
            }
          />
        );
      })}
    </div>
  );
}
