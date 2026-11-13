import type { NodeId } from '../../content/tree';
import type { ProgressContent } from '../../lib/progress/events';
import { getStarCount, getStars } from '../../lib/progress/selectors';
import type { SaveV1 } from '../../lib/storage';

export type NodeState = 'nova' | 'em-progresso' | 'dominada';

export const NODE_STATE_LABEL: Readonly<Record<NodeState, string>> = {
  nova: 'Nova',
  'em-progresso': 'Em progresso',
  dominada: 'Dominada',
};

function idsOf(entries: readonly { id: string }[] | undefined): string[] {
  return entries?.map((entry) => entry.id) ?? [];
}

/** Any recorded work for the node, falling back to the `nXX-` id prefix. */
function touched(
  records: Record<string, unknown>,
  nodeId: NodeId,
  ids: readonly string[],
): boolean {
  if (ids.length > 0) {
    return ids.some((id) => records[id] !== undefined);
  }
  const prefix = `${nodeId}-`;
  return Object.keys(records).some((id) => id.startsWith(prefix));
}

function hasActivity(
  save: SaveV1,
  nodeId: NodeId,
  content: ProgressContent,
): boolean {
  return (
    save.quiz.rounds[nodeId] !== undefined ||
    touched(save.quiz.answers, nodeId, idsOf(content.questions?.[nodeId])) ||
    touched(save.cards, nodeId, idsOf(content.flashcards?.[nodeId])) ||
    touched(save.challenges, nodeId, idsOf(content.challenges?.[nodeId]))
  );
}

/**
 * A node is dominated once all three mode stars are lit. Before that, any
 * recorded work makes it "em progresso"; a fresh node stays "nova".
 */
export function getNodeState(
  save: SaveV1,
  nodeId: NodeId,
  content: ProgressContent = {},
): NodeState {
  if (getStarCount(getStars(save, nodeId, content)) === 3) {
    return 'dominada';
  }
  return hasActivity(save, nodeId, content) ? 'em-progresso' : 'nova';
}
