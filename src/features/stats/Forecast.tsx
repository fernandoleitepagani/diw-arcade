import type { CSSProperties } from 'react';
import { addDays, toDayKey } from '../../lib/game/days';

export interface ForecastProps {
  counts: readonly number[];
  now: Date;
}

function formatDay(dayKey: string): string {
  const [, month = '01', day = '01'] = dayKey.split('-');
  return `${day}/${month}`;
}

function labelFor(now: Date, index: number): string {
  if (index === 0) return 'hoje';
  if (index === 1) return 'amanhã';
  return formatDay(addDays(toDayKey(now), index));
}

export function Forecast({ counts, now }: ForecastProps) {
  const max = Math.max(1, ...counts);

  return (
    <ol className="forecast__list" aria-label="Previsão de 14 dias">
      {counts.map((count, index) => {
        const height = count > 0 ? Math.max((count / max) * 100, 4) : 0;

        return (
          <li className="forecast__item" key={`${index}-${labelFor(now, index)}`}>
            <span className="forecast__label">{labelFor(now, index)}</span>
            <span className="forecast__count">{count}</span>
            <span className="forecast__track" aria-hidden="true">
              <span
                className="forecast__bar"
                style={
                  {
                    '--forecast-height': `${height}%`,
                  } as CSSProperties
                }
              />
            </span>
          </li>
        );
      })}
    </ol>
  );
}
