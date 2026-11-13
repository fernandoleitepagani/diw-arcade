import './Skeleton.css';

export interface SkeletonProps {
  lines?: number;
  block?: boolean;
  label?: string;
  className?: string;
}

const LINE_WIDTHS = ['100%', '88%', '72%', '94%'];
const MAX_LINES = 6;

export function Skeleton({
  lines = 1,
  block = false,
  label = 'Carregando…',
  className,
}: SkeletonProps) {
  const classes = ['ui-skeleton', className].filter(Boolean).join(' ');
  const count = Math.max(1, Math.min(lines, MAX_LINES));

  return (
    <div
      className={classes}
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">{label}</span>
      <div className="ui-skeleton__shapes" aria-hidden="true">
        {block ? (
          <span className="ui-skeleton__block" />
        ) : (
          Array.from({ length: count }, (_, index) => (
            <span
              key={index}
              className="ui-skeleton__line"
              style={{ width: LINE_WIDTHS[index % LINE_WIDTHS.length] }}
            />
          ))
        )}
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div
      className="ui-skeleton ui-page-skeleton"
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Carregando…</span>
      <div className="ui-skeleton__shapes" aria-hidden="true">
        <span className="ui-skeleton__line ui-page-skeleton__title" />
        <span className="ui-skeleton__line" style={{ width: '86%' }} />
        <span className="ui-skeleton__line" style={{ width: '94%' }} />
        <span className="ui-skeleton__block ui-page-skeleton__panel" />
      </div>
    </div>
  );
}
