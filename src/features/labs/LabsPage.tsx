import { Link } from 'react-router';
import { usePageTitle } from '../../app/usePageTitle';
import { Card, Mascot, PageHeader, ProgressRing } from '../../components/ui';
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
      <PageHeader
        eyebrow="Prática guiada"
        title="Laboratórios"
        description="Escolha um mini-projeto, siga os passos e marque cada etapa concluída."
      />

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
            const complete = total > 0 && done >= total;
            const percent = total > 0 ? Math.round((done / total) * 100) : 0;

            return (
              <li key={lab.id}>
                <Card
                  as="article"
                  interactive
                  className="labs-card"
                  aria-labelledby={`labs-${lab.id}`}
                >
                  <div className="labs-card__head">
                    <h2 className="labs-card__title" id={`labs-${lab.id}`}>
                      <Link to={`/laboratorios/${lab.id}`}>{lab.title}</Link>
                    </h2>
                    <ProgressRing
                      className="labs-card__ring"
                      label={`Passos concluídos de ${lab.title}`}
                      max={total}
                      size={56}
                      stroke={6}
                      tone={complete ? 'success' : 'xp'}
                      value={done}
                    >
                      <span aria-hidden="true">{percent}%</span>
                    </ProgressRing>
                  </div>

                  <p className="labs-card__summary">{lab.summary}</p>

                  <p className="labs-card__progress">
                    {done} de {total} passos
                  </p>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
