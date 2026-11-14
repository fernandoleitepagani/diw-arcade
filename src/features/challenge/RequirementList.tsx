import { PixelIcon } from '../../components/pixel/PixelIcon/PixelIcon';
import type { Requirement } from '../../content/schema';
import type { RequirementResult } from '../runner/messages';

export interface RequirementListProps {
  requirements: readonly Requirement[];
  results: readonly RequirementResult[] | null;
}

const STATUS_LABELS = {
  pending: 'pendente',
  passed: 'passou',
  failed: 'falhou',
} as const;

/**
 * Checklist of the challenge requirements. Every item carries a status icon
 * from the first render; the word (passou/falhou) is spoken, and shown only in
 * the terminal and "n de m requisitos" line of the editor.
 */
export function RequirementList({
  requirements,
  results,
}: RequirementListProps) {
  return (
    <section className="requirement-list" aria-labelledby="requirement-list-title">
      <h2 className="requirement-list__title" id="requirement-list-title">
        Requisitos
      </h2>
      <ul className="requirement-list__items">
        {requirements.map((requirement) => {
          const result = results?.find(
            (entry) => entry.id === requirement.id,
          );
          const status =
            result === undefined ? 'pending' : result.passed ? 'passed' : 'failed';

          return (
            <li
              className={`requirement-list__item requirement-list__item--${status}`}
              key={requirement.id}
            >
              <span className="requirement-list__marker">
                {status === 'pending' ? (
                  <span aria-hidden="true">
                    <PixelIcon name="x" />
                  </span>
                ) : (
                  <span role="img" aria-label={STATUS_LABELS[status]}>
                    <PixelIcon name={status === 'passed' ? 'check' : 'x'} />
                  </span>
                )}
              </span>
              <span className="requirement-list__label">{requirement.label}</span>
              {status === 'pending' ? (
                <span className="sr-only">{STATUS_LABELS.pending}</span>
              ) : null}
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
