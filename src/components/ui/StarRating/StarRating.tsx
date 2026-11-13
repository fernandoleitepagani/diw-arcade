import './StarRating.css';

export type StarRatingSize = 'sm' | 'md' | 'lg';

export interface StarRatingModes {
  quiz: boolean;
  cards: boolean;
  code: boolean;
}

export interface StarRatingProps {
  stars?: number;
  modes?: StarRatingModes;
  showLabels?: boolean;
  celebrate?: boolean;
  size?: StarRatingSize;
  className?: string;
}

const MODES = [
  { key: 'quiz', label: 'quiz' },
  { key: 'cards', label: 'cartas' },
  { key: 'code', label: 'código' },
] as const;

export function StarRating({
  stars = 0,
  modes,
  showLabels = false,
  celebrate = false,
  size = 'md',
  className,
}: StarRatingProps) {
  const safeStars = Math.min(3, Math.max(0, Math.round(stars)));
  const completed: StarRatingModes = modes ?? {
    quiz: safeStars > 0,
    cards: safeStars > 1,
    code: safeStars > 2,
  };
  const label = `Domínio: ${MODES.map(
    ({ key, label: modeLabel }) =>
      `${modeLabel} ${completed[key] ? 'concluído' : 'pendente'}`,
  ).join(', ')}`;
  const classes = [
    'ui-stars',
    `ui-stars--${size}`,
    showLabels ? 'ui-stars--labelled' : '',
    celebrate ? 'ui-stars--celebrate' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes} role="img" aria-label={label}>
      {MODES.map(({ key, label: modeLabel }) => (
        <span className="ui-stars__item" key={key}>
          <span
            className={
              completed[key]
                ? 'ui-stars__star ui-stars__star--on'
                : 'ui-stars__star'
            }
            aria-hidden="true"
          >
            {completed[key] ? '★' : '☆'}
          </span>
          {showLabels ? (
            <span className="ui-stars__label" aria-hidden="true">
              {modeLabel}
            </span>
          ) : null}
        </span>
      ))}
    </span>
  );
}
