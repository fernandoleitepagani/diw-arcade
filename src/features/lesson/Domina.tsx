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
          {items.map((item) => (
            <li key={item.id} className="domina__row">
              <span className="domina__front">{item.front}</span>
              <span className={`domina__state domina__state--${item.state}`}>
                {item.state}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
