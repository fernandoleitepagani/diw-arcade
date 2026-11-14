import { Link } from 'react-router';
import type { CSSProperties } from 'react';
import { PixelIcon } from '../../components/pixel/PixelIcon/PixelIcon';
import type { NodeId } from '../../content';
import {
  LESSON_STEP_IDS,
  type LessonStepId,
  type LessonSteps,
  type LessonStepStatus,
} from '../../lib/progress/lessonSteps';
import './LessonStepper.css';

export const STEP_LABEL: Readonly<Record<LessonStepId, string>> = {
  ler: 'Ler',
  praticar: 'Praticar',
  fixar: 'Fixar',
  construir: 'Construir',
};

const STATUS_TEXT: Readonly<Record<LessonStepStatus, string>> = {
  pendente: 'pendente',
  feito: 'feito',
  indisponivel: 'em breve',
};

export interface LessonStepperProps {
  nodeId: NodeId;
  steps: LessonSteps;
  current: LessonStepId;
  /** One caption per step, shown under its name. */
  counts?: Readonly<Record<LessonStepId, string>>;
  /** Unit color for finished steps. */
  color?: string;
}

export function LessonStepper({
  nodeId,
  steps,
  current,
  counts,
  color,
}: LessonStepperProps) {
  const style = color ? ({ '--c': color } as CSSProperties) : undefined;
  return (
    <ol className="lesson-stepper" aria-label="Passos da lição" style={style}>
      {LESSON_STEP_IDS.map((id, index) => (
        <li
          key={id}
          className={`lesson-stepper__item lesson-stepper__item--${steps[id]}`}
          aria-current={id === current ? 'step' : undefined}
        >
          <Link
            className="lesson-stepper__link"
            to={`/no/${nodeId}?passo=${id}`}
          >
            <span className="lesson-stepper__num" aria-hidden="true">
              {steps[id] === 'feito' ? (
                <PixelIcon name="check" />
              ) : (
                index + 1
              )}
            </span>
            <span className="lesson-stepper__label">{STEP_LABEL[id]}</span>
            <span className="lesson-stepper__status">
              {counts ? (
                <>
                  {counts[id]}
                  <span className="sr-only">, {STATUS_TEXT[steps[id]]}</span>
                </>
              ) : (
                STATUS_TEXT[steps[id]]
              )}
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
