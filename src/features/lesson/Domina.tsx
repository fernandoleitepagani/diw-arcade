import { PixelIcon } from '../../components/pixel/PixelIcon/PixelIcon';
import type { CardMastery } from './masteryState';
import './Domina.css';

export interface DominaItem {
  id: string;
  front: string;
  state: CardMastery;
}

export function Domina({ items }: { items: readonly DominaItem[] }) {
  return (
    <section className="domina" aria-labelledby="domina-title">
      <h2 className="domina__title" id="domina-title">
        O que você já domina
      </h2>
      {items.length === 0 ? (
        <p className="domina__empty">Sem termos neste nó ainda.</p>
      ) : (
        <ul className="domina__list">
          {items.map((item) => {
            const mastered = item.state === 'dominada';
            return (
              <li key={item.id} className="domina__row">
                <code className="domina__front">{item.front}</code>
                <span
                  className={`domina__state${mastered ? ' domina__state--ok' : ''}`}
                >
                  {mastered ? <PixelIcon name="check" /> : null}
                  {mastered ? 'Dominado' : 'Falta praticar'}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
