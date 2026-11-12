import { useId } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import type { Stars } from '../../lib/progress/selectors';
import { Mascot, type MascotMood } from '../ui';
import { CountUp } from '../motion';
import './SessionSummary.css';

const MODES = [
  { key: 'quiz', label: 'quiz' },
  { key: 'cards', label: 'cartas' },
  { key: 'code', label: 'código' },
] as const;

const NO_STARS: Stars = { quiz: false, cards: false, code: false };

export interface SessionStat {
  label: string;
  value: ReactNode;
}

export interface SessionSummaryProps {
  title: string;
  xp: number;
  stats: SessionStat[];
  starsBefore?: Stars;
  starsAfter?: Stars;
  nextHref: string;
  nextLabel?: string;
  secondary?: ReactNode;
  mascotMood: MascotMood;
}

function starsLabel(before: Stars, after: Stars): string {
  const earned = MODES.filter(
    (mode) => after[mode.key] && !before[mode.key],
  ).map((mode) => mode.label);

  return earned.length === 0
    ? 'Nenhuma estrela nova nesta rodada'
    : `Estrelas conquistadas: ${earned.join(', ')}`;
}

export function SessionSummary({
  title,
  xp,
  stats,
  starsBefore,
  starsAfter,
  nextHref,
  nextLabel = 'Próximo passo',
  secondary,
  mascotMood,
}: SessionSummaryProps) {
  const titleId = useId();
  const before = starsBefore ?? NO_STARS;

  return (
    <section className="session-summary" aria-labelledby={titleId}>
      <Mascot mood={mascotMood} size={80} />
      <h2 id={titleId} className="session-summary__title">
        {title}
      </h2>
      <p className="session-summary__xp">
        <CountUp
          prefix="+"
          value={xp}
          className="session-summary__xp-value"
        />
        <span className="session-summary__xp-label">XP</span>
      </p>

      <dl className="session-summary__stats">
        {stats.map((stat, index) => (
          <div key={`${stat.label}-${index}`} className="session-summary__stat">
            <dt>{stat.label}</dt>
            <dd>{stat.value}</dd>
          </div>
        ))}
      </dl>

      {starsAfter ? (
        <div className="session-summary__stars-block">
          <h3 className="session-summary__stars-title">
            Estrelas conquistadas
          </h3>
          <div
            className="session-summary__stars"
            role="img"
            aria-label={starsLabel(before, starsAfter)}
          >
            {MODES.map((mode) => {
              const on = starsAfter[mode.key];
              const isNew = on && !before[mode.key];
              const classes = [
                'session-summary__star',
                on ? 'session-summary__star--on' : '',
                isNew ? 'session-summary__star--new' : '',
              ]
                .filter(Boolean)
                .join(' ');

              return (
                <span key={mode.key} className={classes} aria-hidden="true">
                  {on ? '★' : '☆'}
                </span>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="session-summary__actions">
        <Link className="session-summary__next" to={nextHref}>
          {nextLabel}
        </Link>
        {secondary}
      </div>
    </section>
  );
}
