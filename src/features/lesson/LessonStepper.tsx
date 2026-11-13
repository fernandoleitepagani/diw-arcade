import { Link } from 'react-router';
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
}

export function LessonStepper({ nodeId, steps, current }: LessonStepperProps) {
  return (
    <ol className="lesson-stepper">
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
              {steps[id] === 'feito' ? '✓' : index + 1}
            </span>
            <span className="lesson-stepper__label">{STEP_LABEL[id]}</span>
            <span className="lesson-stepper__status">
              {STATUS_TEXT[steps[id]]}
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
