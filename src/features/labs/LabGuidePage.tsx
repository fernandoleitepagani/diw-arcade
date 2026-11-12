import { useState } from 'react';
import { useParams } from 'react-router';
import {
  useProgress as readProgressContext,
  type ProgressContextValue,
} from '../../app/ProgressProvider';
import { usePageTitle } from '../../app/usePageTitle';
import { Badge, Button, PageHeader, Panel } from '../../components/ui';
import {
  LAB_IDS,
  REPO_URL_PREFIX,
  getLab,
  type LabGuide,
  type LabId,
  type LabStep,
} from '../../content';
import { getLabProgress } from '../../lib/progress';
import './Labs.css';

/**
 * The app always mounts ProgressProvider. Shell-level route tests render a
 * page without it, so read the context when it is there and let the static
 * content render when it is not.
 */
export function useOptionalProgress(): ProgressContextValue | null {
  try {
    return readProgressContext();
  } catch {
    return null;
  }
}

function findLab(labId: string | undefined): LabGuide | undefined {
  if (labId === undefined || !(LAB_IDS as readonly string[]).includes(labId)) {
    return undefined;
  }
  return getLab(labId as LabId);
}

function repoHref(path: string): string {
  return `${REPO_URL_PREFIX}/tree/main/${path}`;
}

interface TipsListProps {
  title: string;
  tips: readonly string[];
}

function TipsList({ title, tips }: TipsListProps) {
  if (tips.length === 0) return null;

  return (
    <section className="labs-tips__group" aria-labelledby={`labs-tips-${title}`}>
      <h3 id={`labs-tips-${title}`}>{title}</h3>
      <ul>
        {tips.map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </ul>
    </section>
  );
}

interface LabStepItemProps {
  labId: LabId;
  step: LabStep;
  progress: ProgressContextValue | null;
}

function LabStepItem({ labId, step, progress }: LabStepItemProps) {
  const entry = progress?.save.labs[labId]?.[step.id];
  const done = entry?.done ?? false;
  const awarded = entry?.xpAwarded ?? false;
  const [copied, setCopied] = useState(false);

  function toggle(checked: boolean): void {
    progress?.dispatch({
      type: 'lab/step',
      labId,
      stepId: step.id,
      done: checked,
    });
  }

  async function copyCode(): Promise<void> {
    if (step.code === undefined) return;
    try {
      await navigator.clipboard.writeText(step.code.text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <li className="labs-step" data-done={done}>
      <h3 className="labs-step__title">{step.title}</h3>

      <label className="labs-step__check">
        <input
          type="checkbox"
          checked={done}
          onChange={(event) => toggle(event.currentTarget.checked)}
        />
        <span>
          {awarded
            ? 'Concluí este passo (XP já recebido)'
            : 'Concluí este passo (+3 XP)'}
        </span>
      </label>

      <div className="labs-step__body">
        {step.body.split('\n\n').map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>

      {step.checklist !== undefined && step.checklist.length > 0 ? (
        <ul className="labs-step__checklist">
          {step.checklist.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}

      {step.code !== undefined ? (
        <div className="labs-code">
          <div className="labs-code__bar">
            <span className="labs-code__lang">{step.code.lang}</span>
            <Button
              variant="ghost"
              onClick={() => {
                void copyCode();
              }}
            >
              {copied ? 'Copiado' : 'Copiar'}
            </Button>
          </div>
          <pre className="labs-code__pre">
            <code>{step.code.text}</code>
          </pre>
        </div>
      ) : null}

      {step.repoPath !== undefined ? (
        <p className="labs-step__repo">
          <span>Repositório: </span>
          <a
            href={repoHref(step.repoPath)}
            target="_blank"
            rel="noopener noreferrer"
          >
            {step.repoPath}
          </a>
        </p>
      ) : null}
    </li>
  );
}

export interface LabGuidePageProps {
  /** Test seam: render a specific guide instead of looking up the route id. */
  lab?: LabGuide;
}

export function LabGuidePage({ lab: givenLab }: LabGuidePageProps = {}) {
  const { labId } = useParams<{ labId: string }>();
  const lab = givenLab ?? findLab(labId);
  const progress = useOptionalProgress();

  usePageTitle(lab?.title ?? 'Laboratório');

  if (lab === undefined) {
    return (
      <section className="page labs-page">
        <h1>Laboratório</h1>
        <p>Guia não encontrado</p>
      </section>
    );
  }

  const { done, total } = progress
    ? getLabProgress(progress.save, lab.id, lab)
    : { done: 0, total: lab.steps.length };
  const complete = total > 0 && done >= total;

  return (
    <section className="page labs-page labs-guide">
      <PageHeader
        eyebrow="Guia de projeto"
        title="Laboratório"
        actions={
          <Badge tone={complete ? 'success' : 'xp'}>
            {done} de {total} passos
          </Badge>
        }
      />

      <div className="labs-guide__intro">
        <h2 className="labs-guide__title">{lab.title}</h2>
        <p className="labs-guide__summary">{lab.summary}</p>
      </div>

      <div className="labs-guide__layout">
        <div className="labs-guide__main">
          <section className="labs-section" aria-labelledby="labs-steps">
            <h2 id="labs-steps">Passos</h2>
            <ol className="labs-steps">
              {lab.steps.map((step) => (
                <LabStepItem
                  key={step.id}
                  labId={lab.id}
                  step={step}
                  progress={progress}
                />
              ))}
            </ol>
          </section>
        </div>

        <Panel
          as="aside"
          className="labs-guide__aside"
          aria-label="Rubrica e dicas"
        >
          <section className="labs-section" aria-labelledby="labs-requirements">
            <h2 id="labs-requirements">Requisitos do laboratório</h2>
            <ul className="labs-rubric">
              {lab.requirements.map((requirement, index) => (
                <li key={`${requirement.text}-${index}`}>
                  <p>{requirement.text}</p>
                  {requirement.source !== undefined ? (
                    <p className="labs-source">
                      Fonte: laboratório {requirement.source.lab}, slide{' '}
                      {requirement.source.slide}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>

          <section className="labs-section" aria-labelledby="labs-tips">
            <h2 id="labs-tips">Dicas de estrutura</h2>
            <div className="labs-tips">
              <TipsList title="HTML" tips={lab.tips.html} />
              <TipsList title="CSS" tips={lab.tips.css} />
              <TipsList title="JS" tips={lab.tips.js} />
            </div>
          </section>
        </Panel>
      </div>
    </section>
  );
}
