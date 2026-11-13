import type { CSSProperties } from 'react';
import type { UnitId } from '../../../content/tree';
import { PixelIcon } from '../../../components/pixel/PixelIcon/PixelIcon';
import { UNIT_COLOR } from '../../../styles/unitColors';
import './NodeDisc.css';

export type DiscState = 'done' | 'current' | 'todo';

export interface NodeDiscProps {
  unit: UnitId;
  state: DiscState;
  /** Two-digit trail number. */
  number: string;
}

/**
 * Decorative disc: the state is also written as text next to it, so the disc
 * is hidden from assistive tech.
 */
export function NodeDisc({ unit, state, number }: NodeDiscProps) {
  return (
    <span
      className={`node-disc node-disc--${state}`}
      style={{ '--c': UNIT_COLOR[unit] } as CSSProperties}
      aria-hidden="true"
    >
      <span className="node-disc__face">
        {state === 'done' ? <PixelIcon name="check" /> : number}
      </span>
    </span>
  );
}
