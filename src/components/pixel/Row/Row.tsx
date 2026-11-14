import type { ReactNode } from 'react';
import { Link } from 'react-router';
import type { IconName } from '../icons';
import { PixelIcon } from '../PixelIcon/PixelIcon';
import './Row.css';

export interface RowProps {
  icon: IconName;
  children: ReactNode;
  /** `ariaLabel` gives repeated labels ("Abrir") a distinct accessible name. */
  action: { label: string; to: string; ariaLabel?: string };
}

export function Row({ icon, children, action }: RowProps) {
  return (
    <div className="row">
      <span className="row__ic" aria-hidden>
        <PixelIcon name={icon} scale={3} />
      </span>
      <div className="row__t">{children}</div>
      <Link className="row__go" to={action.to} aria-label={action.ariaLabel}>
        {action.label}
        <PixelIcon name="route" />
      </Link>
    </div>
  );
}
