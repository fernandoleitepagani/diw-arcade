import './StarRating.css';

export type StarRatingSize = 'sm' | 'md';

export interface StarRatingProps {
  stars: number;
  size?: StarRatingSize;
  className?: string;
}

const MODES = ['quiz', 'cartas', 'código'] as const;

export function StarRating({
  stars,
  size = 'md',
  className,
}: StarRatingProps) {
  const safeStars = Math.min(3, Math.max(0, Math.round(stars)));
  const label = `Domínio: ${MODES.map(
    (mode, index) =>
      `${mode} ${index < safeStars ? 'concluído' : 'pendente'}`,
  ).join(', ')}`;
  const classes = ['ui-stars', `ui-stars--${size}`, className]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes} role="img" aria-label={label}>
      {MODES.map((mode, index) => (
        <span
          key={mode}
          className={
            index < safeStars
              ? 'ui-stars__star ui-stars__star--on'
              : 'ui-stars__star'
          }
          aria-hidden="true"
        >
          {index < safeStars ? '★' : '☆'}
        </span>
      ))}
    </span>
  );
}
