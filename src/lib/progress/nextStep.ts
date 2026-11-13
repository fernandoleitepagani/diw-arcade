import { NODES, type NodeId, type UnitId } from '../../content/tree';
import type { SaveV1 } from '../storage/schema';
import type { ProgressContent } from './events';
import {
  LESSON_STEP_IDS,
  getLessonSteps,
  type LessonStepId,
} from './lessonSteps';
import { getRecommendedNodeId } from './recommend';
import { getDueCountByNode } from './selectors';

export interface NextAction {
  label: string;
  href: string;
  /** Node title, when the action belongs to a node. */
  detail?: string;
  nodeId?: NodeId;
  unitId?: UnitId;
}

export interface NextStep {
  primary: NextAction;
  /** Up to three distinct actions, never repeating the primary. */
  alternates: NextAction[];
  goal: string;
}

const STEP_LABEL: Readonly<Record<LessonStepId, string>> = {
  ler: 'Ler o resumo',
  praticar: 'Praticar com o quiz',
  fixar: 'Fixar com as cartas',
  construir: 'Construir o desafio',
};

const MAX_ALTERNATES = 3;

const TRAIL: NextAction = { label: 'Abrir a trilha', href: '/trilha' };

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

function hasContent(content: ProgressContent, nodeId: NodeId): boolean {
  return (
    (content.questions?.[nodeId]?.length ?? 0) > 0 ||
    (content.flashcards?.[nodeId]?.length ?? 0) > 0 ||
    (content.challenges?.[nodeId]?.length ?? 0) > 0
  );
}

export function getNextStep(
  save: SaveV1,
  content: ProgressContent,
  now: Date,
): NextStep {
  const nodeId = getRecommendedNodeId(save, content, now);
  const node = NODES.find((candidate) => candidate.id === nodeId);
  if (node === undefined || !hasContent(content, nodeId)) {
    return {
      primary: TRAIL,
      alternates: [],
      goal: 'Abra a trilha e escolha por onde começar.',
    };
  }

  const nodeFields = {
    detail: node.title,
    nodeId,
    unitId: node.unitId,
  };
  const steps = getLessonSteps(save, nodeId, content, {
    hasPrimer: false,
    primersRead: new Set<NodeId>(),
  });
  const stepActions: NextAction[] = LESSON_STEP_IDS.filter(
    (id) => steps[id] === 'pendente',
  ).map((id) => ({
    label: STEP_LABEL[id],
    href: `/no/${nodeId}?passo=${id}`,
    ...nodeFields,
  }));
  const nodeAction: NextAction = {
    label: 'Rever o nó',
    href: `/no/${nodeId}`,
    ...nodeFields,
  };

  const dueTotal = Object.values(getDueCountByNode(save, content, now)).reduce(
    (total, count) => total + count,
    0,
  );

  let primary: NextAction;
  let rest: NextAction[];
  let goal: string;
  if (dueTotal > 0) {
    primary = {
      label: `Revisar ${plural(dueTotal, 'carta', 'cartas')}`,
      href: '/revisao',
    };
    rest = [...stepActions, nodeAction];
    goal = `Hoje, revise ${plural(dueTotal, 'carta pendente', 'cartas pendentes')} para não perder o que já aprendeu.`;
  } else if (stepActions.length > 0) {
    [primary, ...rest] = stepActions as [NextAction, ...NextAction[]];
    goal = `Hoje, avance em ${node.title}: ${primary.label.toLowerCase()}.`;
  } else {
    primary = nodeAction;
    rest = [];
    goal = `Hoje, volte a ${node.title} para manter o domínio.`;
  }

  const alternates = [...rest, TRAIL]
    .filter(
      (action, index, all) =>
        action.href !== primary.href &&
        all.findIndex((other) => other.href === action.href) === index,
    )
    .slice(0, MAX_ALTERNATES);

  return { primary, alternates, goal };
}
