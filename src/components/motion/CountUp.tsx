import { useLayoutEffect, useRef } from 'react';
import { useMotionAllowed } from '../../lib/a11y/useMotionAllowed';

export interface CountUpProps {
  value: number;
  prefix?: string;
  durationMs?: number;
  className?: string;
}

function format(value: number, prefix: string): string {
  return `${prefix}${Math.round(value)}`;
}

function easeOut(progress: number): number {
  return 1 - (1 - progress) ** 3;
}

export function CountUp({
  value,
  prefix = '',
  durationMs = 500,
  className,
}: CountUpProps) {
  const motionAllowed = useMotionAllowed();
  const valueRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const node = valueRef.current;
    if (!node) return;

    if (!motionAllowed || durationMs <= 0) {
      node.textContent = format(value, prefix);
      return;
    }

    let frame = 0;
    let start: number | null = null;

    node.textContent = format(0, prefix);

    const tick = (timestamp: number) => {
      if (start === null) start = timestamp;
      const progress = Math.min((timestamp - start) / durationMs, 1);
      node.textContent = format(value * easeOut(progress), prefix);

      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        node.textContent = format(value, prefix);
      }
    };

    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [durationMs, motionAllowed, prefix, value]);

  return (
    <span ref={valueRef} className={className}>
      {format(value, prefix)}
    </span>
  );
}
