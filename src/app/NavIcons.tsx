interface NavIconProps {
  className?: string;
}

const COMMON = {
  viewBox: '0 0 8 8',
  'aria-hidden': true,
  focusable: 'false',
  shapeRendering: 'crispEdges',
} as const;

export function TreeIcon({ className }: NavIconProps) {
  return (
    <svg className={className} {...COMMON}>
      <g fill="currentColor">
        <rect x="3" y="0" width="2" height="1" />
        <rect x="1" y="1" width="6" height="1" />
        <rect x="3" y="2" width="2" height="1" />
        <rect x="3" y="3" width="2" height="4" />
        <rect x="0" y="4" width="3" height="1" />
        <rect x="5" y="4" width="3" height="1" />
        <rect x="0" y="5" width="2" height="2" />
        <rect x="6" y="5" width="2" height="2" />
      </g>
    </svg>
  );
}

export function ReviewIcon({ className }: NavIconProps) {
  return (
    <svg className={className} {...COMMON}>
      <g fill="currentColor">
        <rect x="1" y="0" width="6" height="1" />
        <rect x="1" y="0" width="1" height="6" />
        <rect x="6" y="0" width="1" height="6" />
        <rect x="1" y="5" width="6" height="1" />
        <rect x="3" y="2" width="2" height="1" />
        <rect x="5" y="3" width="2" height="1" />
        <rect x="6" y="4" width="1" height="1" />
      </g>
    </svg>
  );
}

export function LabIcon({ className }: NavIconProps) {
  return (
    <svg className={className} {...COMMON}>
      <g fill="currentColor">
        <rect x="3" y="0" width="2" height="1" />
        <rect x="3" y="1" width="2" height="2" />
        <rect x="2" y="3" width="4" height="1" />
        <rect x="1" y="4" width="6" height="1" />
        <rect x="1" y="5" width="1" height="1" />
        <rect x="6" y="5" width="1" height="1" />
        <rect x="2" y="6" width="4" height="1" />
        <rect x="3" y="7" width="2" height="1" />
      </g>
    </svg>
  );
}

export function StatsIcon({ className }: NavIconProps) {
  return (
    <svg className={className} {...COMMON}>
      <g fill="currentColor">
        <rect x="0" y="5" width="2" height="3" />
        <rect x="3" y="2" width="2" height="6" />
        <rect x="6" y="0" width="2" height="8" />
      </g>
    </svg>
  );
}

export function SettingsIcon({ className }: NavIconProps) {
  return (
    <svg className={className} {...COMMON}>
      <g fill="currentColor">
        <rect x="3" y="0" width="2" height="1" />
        <rect x="3" y="7" width="2" height="1" />
        <rect x="0" y="3" width="1" height="2" />
        <rect x="7" y="3" width="1" height="2" />
        <rect x="1" y="1" width="1" height="1" />
        <rect x="6" y="1" width="1" height="1" />
        <rect x="1" y="6" width="1" height="1" />
        <rect x="6" y="6" width="1" height="1" />
        <rect x="2" y="2" width="4" height="1" />
        <rect x="2" y="5" width="4" height="1" />
        <rect x="2" y="3" width="1" height="2" />
        <rect x="5" y="3" width="1" height="2" />
      </g>
    </svg>
  );
}
