import { Link } from 'react-router';
import { usePageTitle } from '../../app/usePageTitle';
import { Mascot } from '../../components/ui';
import { getLabs, type LabGuide } from '../../content';
import { pickLine } from '../../content/copy';
import { getLabProgress } from '../../lib/progress';
import { useOptionalProgress } from './LabGuidePage';
import './Labs.css';

export interface LabsPageProps {
  /** Test seam: override the guides that come from the content index. */
  labs?: readonly LabGuide[];
}

export function LabsPage({ labs }: LabsPageProps = {}) {
  usePageTitle('Laboratórios');
  const progress = useOptionalProgress();
  const guides = labs ?? getLabs();

  return (
    <section className="page labs-page">
      <h1>Laboratórios</h1>

      {guides.length === 0 ? (
        <div className="labs-empty">
          <p>Conteúdo em breve</p>
          <Mascot mood="idle" line={pickLine('empty', 0)} />
        </div>
      ) : (
        <ul className="labs-grid">
          {guides.map((lab) => {
            const { done, total } = progress
              ? getLabProgress(progress.save, lab.id, lab)
              : { done: 0, total: lab.steps.length };

            return (
              <li key={lab.id}>
                <article className="labs-card" aria-labelledby={`labs-${lab.id}`}>
                  <h2 className="labs-card__title" id={`labs-${lab.id}`}>
                    <Link to={`/laboratorios/${lab.id}`}>{lab.title}</Link>
                  </h2>
                  <p className="labs-card__summary">{lab.summary}</p>
                  <p className="labs-card__progress">
                    {done} de {total} passos
                  </p>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
