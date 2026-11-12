import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useReducedMotion } from '../../../lib/a11y/useReducedMotion';
import './ClickSpark.css';

const SPARK_COUNT = 8;
const SPARK_LIFETIME_MS = 400;

interface Spark {
  id: number;
  x: number;
  y: number;
  angle: number;
  color: string;
}

export function ClickSpark({ children }: { children?: ReactNode }) {
  const reducedMotion = useReducedMotion();
  const [sparks, setSparks] = useState<Spark[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(0);
  const timeouts = useRef(new Set<number>());

  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }

    function handleClick(event: MouseEvent) {
      if (reducedMotion) {
        return;
      }

      const batch: Spark[] = Array.from({ length: SPARK_COUNT }, (_, index) => ({
        id: nextId.current++,
        x: event.clientX,
        y: event.clientY,
        angle: (360 / SPARK_COUNT) * index,
        color: index % 2 === 0 ? 'var(--accent)' : 'var(--reward)',
      }));
      const batchIds = new Set(batch.map((spark) => spark.id));

      setSparks((current) => [...current, ...batch]);

      const timeout = window.setTimeout(() => {
        setSparks((current) => current.filter((spark) => !batchIds.has(spark.id)));
        timeouts.current.delete(timeout);
      }, SPARK_LIFETIME_MS);
      timeouts.current.add(timeout);
    }

    root.addEventListener('click', handleClick);
    return () => root.removeEventListener('click', handleClick);
  }, [reducedMotion]);

  useEffect(() => {
    const pending = timeouts.current;
    return () => {
      pending.forEach((timeout) => window.clearTimeout(timeout));
      pending.clear();
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className="click-spark"
      data-motion={reducedMotion ? 'off' : 'on'}
    >
      {children}
      <div className="click-spark__layer" aria-hidden="true">
        {sparks.map((spark) => (
          <span
            key={spark.id}
            className="click-spark__spark"
            data-spark="true"
            style={
              {
                left: spark.x,
                top: spark.y,
                '--spark-angle': `${spark.angle}deg`,
                '--spark-color': spark.color,
              } as CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}
