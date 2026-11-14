import {
  LAB_IDS,
  getLab,
  type LabId,
  type NodeId,
  type UnitId,
} from '../../content';
import type { ProgressContent } from '../../lib/progress/events';
import { getDueCountByNode, getLabProgress } from '../../lib/progress/selectors';
import type { SaveV1 } from '../../lib/storage';
import { LAB_UNIT } from '../tree/projects';

export interface StepCounts {
  ler: string;
  praticar: string;
  fixar: string;
  construir: string;
}

export interface StepCountOptions {
  now: Date;
  /** Primer point count; absent means the node has no summary. */
  primerPoints?: number;
}

export function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** Best round as "x de y certas" (accuracy is stored as a percentage). */
export function getBestRound(
  save: SaveV1,
  nodeId: NodeId,
  questionCount: number,
): { right: number; total: number } | null {
  const round = save.quiz.rounds[nodeId];
  if (!round || round.count === 0 || questionCount === 0) return null;
  return {
    right: Math.round((round.best / 100) * questionCount),
    total: questionCount,
  };
}

export function getStepCounts(
  save: SaveV1,
  nodeId: NodeId,
  content: ProgressContent,
  { now, primerPoints }: StepCountOptions,
): StepCounts {
  const questions = content.questions?.[nodeId]?.length ?? 0;
  const challenges = content.challenges?.[nodeId]?.length ?? 0;
  const due = getDueCountByNode(save, content, now)[nodeId] ?? 0;
  const best = getBestRound(save, nodeId, questions);
  return {
    ler:
      primerPoints === undefined
        ? 'sem resumo'
        : plural(primerPoints, 'ponto', 'pontos'),
    praticar: best
      ? `${best.right} de ${best.total} certas`
      : plural(questions, 'pergunta', 'perguntas'),
    fixar: plural(due, 'carta hoje', 'cartas hoje'),
    construir: plural(challenges, 'desafio', 'desafios'),
  };
}

export interface UnitLab {
  id: LabId;
  title: string;
  status: string;
}

/** Labs that sit on the given unit, each with its progress as text. */
export function getUnitLabs(save: SaveV1, unitId: UnitId): UnitLab[] {
  return LAB_IDS.filter((labId) => LAB_UNIT[labId] === unitId).flatMap(
    (labId) => {
      const lab = getLab(labId);
      if (!lab) return [];
      const { done, total } = getLabProgress(save, labId, lab);
      const status =
        done === 0
          ? 'Não iniciado'
          : done >= total
            ? 'Concluído'
            : `${done} de ${total} passos`;
      return [{ id: labId, title: lab.title, status }];
    },
  );
}
