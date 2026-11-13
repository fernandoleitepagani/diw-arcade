import type { CSSProperties, ReactNode } from 'react';
import type { UnitId } from '../../../content/tree';
import { UNIT_COLOR } from '../../../styles/unitColors';
import './Tag.css';

export interface TagProps {
  unit: UnitId;
  children: ReactNode;
}

export function Tag({ unit, children }: TagProps) {
  return (
    <span className="tag">
      <span
        className="dot"
        aria-hidden
        style={{ '--c': UNIT_COLOR[unit] } as CSSProperties}
      />
      {children}
    </span>
  );
}
