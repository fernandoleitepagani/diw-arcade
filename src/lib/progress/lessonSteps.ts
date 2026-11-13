import type { NodeId } from '../../content/tree';
import type { SaveV1 } from '../storage/schema';
import type { ProgressContent } from './events';
import { getStars } from './selectors';

export const LESSON_STEP_IDS = ['ler', 'praticar', 'fixar', 'construir'] as const;
export type LessonStepId = (typeof LESSON_STEP_IDS)[number];
export type LessonStepStatus = 'pendente' | 'feito' | 'indisponivel';
export type LessonSteps = Readonly<Record<LessonStepId, LessonStepStatus>>;

export interface LessonStepOptions {
  hasPrimer: boolean;
  primersRead: ReadonlySet<NodeId>;
}

export function getLessonSteps(
  save: SaveV1,
  nodeId: NodeId,
  content: ProgressContent,
  opts: LessonStepOptions,
): LessonSteps {
  const stars = getStars(save, nodeId, content);
  const hasChallenges = (content.challenges?.[nodeId] ?? []).length > 0;
  const ler: LessonStepStatus = !opts.hasPrimer
    ? 'indisponivel'
    : opts.primersRead.has(nodeId)
      ? 'feito'
      : 'pendente';
  return {
    ler,
    praticar: stars.quiz ? 'feito' : 'pendente',
    fixar: stars.cards ? 'feito' : 'pendente',
    construir: !hasChallenges ? 'indisponivel' : stars.code ? 'feito' : 'pendente',
  };
}

/** First step still `pendente`, or null when nothing is left. */
export function firstUnfinishedStep(steps: LessonSteps): LessonStepId | null {
  return LESSON_STEP_IDS.find((id) => steps[id] === 'pendente') ?? null;
}
