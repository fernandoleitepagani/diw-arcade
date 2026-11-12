import type { Requirement } from '../../content/schema';
import type { RequirementResult } from '../runner/messages';

export interface RequirementListProps {
  requirements: readonly Requirement[];
  results: readonly RequirementResult[] | null;
  running?: boolean;
}

/**
 * Checklist of the challenge requirements plus a polite live summary such as
 * "2 de 3 requisitos".
 */
export function RequirementList({
  requirements,
  results,
  running = false,
}: RequirementListProps) {
  const passed = requirements.filter(
    (requirement) =>
      results?.some(
        (result) => result.id === requirement.id && result.passed,
      ) === true,
  ).length;

  const summary =
    results === null
      ? running
        ? 'Executando testes…'
        : 'Nenhum teste executado ainda'
      : `${passed} de ${requirements.length} requisitos`;

  return (
    <section className="requirement-list" aria-labelledby="requirement-list-title">
      <h2 className="requirement-list__title" id="requirement-list-title">
        Requisitos
      </h2>
      <p className="requirement-list__summary" aria-live="polite">
        {summary}
      </p>
      <ul className="requirement-list__items">
        {requirements.map((requirement) => {
          const result = results?.find(
            (entry) => entry.id === requirement.id,
          );
          const status =
            result === undefined ? 'pending' : result.passed ? 'passed' : 'failed';
          const marker =
            status === 'passed' ? '✓' : status === 'failed' ? '✗' : '•';
          const statusLabel =
            status === 'passed'
              ? 'Requisito cumprido'
              : status === 'failed'
                ? 'Requisito não cumprido'
                : 'Requisito ainda não verificado';

          return (
            <li
              className={`requirement-list__item requirement-list__item--${status}`}
              key={requirement.id}
            >
              <span className="requirement-list__marker" aria-hidden="true">
                {marker}
              </span>
              <span className="requirement-list__label">{requirement.label}</span>
              <span className="requirement-list__status">{statusLabel}</span>
              {result?.message ? (
                <span className="requirement-list__message">{result.message}</span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
