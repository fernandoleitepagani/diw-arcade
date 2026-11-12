import { NODE_IDS, type NodeId } from '../../content/tree';
import type { SaveV1 } from '../storage/schema';
import type { ProgressContent } from './events';
import { getDueCountByNode, getStars, getStarCount } from './selectors';

function hasContent(content: ProgressContent, nodeId: NodeId): boolean {
  return (
    (content.questions?.[nodeId]?.length ?? 0) > 0 ||
    (content.flashcards?.[nodeId]?.length ?? 0) > 0 ||
    (content.challenges?.[nodeId]?.length ?? 0) > 0
  );
}

/**
 * The node the tree highlights.
 *
 * 1. If any node has cards due, pick the node with the most due cards. Ties go
 *    to the earliest node in canonical order.
 * 2. Otherwise pick the earliest node with the fewest stars. Nodes that have no
 *    content yet are not candidates, so the recommendation never points at
 *    "Conteúdo em breve".
 * 3. A brand-new save with no cards due therefore gets `n01`.
 */
export function getRecommendedNodeId(
  save: SaveV1,
  content: ProgressContent = {},
  now: Date = new Date(),
): NodeId {
  const due = getDueCountByNode(save, content, now);

  let dueLeader: NodeId | null = null;
  let mostDue = 0;
  for (const nodeId of NODE_IDS) {
    const count = due[nodeId] ?? 0;
    if (count > mostDue) {
      mostDue = count;
      dueLeader = nodeId;
    }
  }
  if (dueLeader !== null) return dueLeader;

  const withContent = NODE_IDS.filter((nodeId) => hasContent(content, nodeId));
  const candidates = withContent.length > 0 ? withContent : [...NODE_IDS];

  let recommended: NodeId = candidates[0] ?? 'n01';
  let fewest = Number.POSITIVE_INFINITY;
  for (const nodeId of candidates) {
    const stars = getStarCount(getStars(save, nodeId, content));
    if (stars < fewest) {
      fewest = stars;
      recommended = nodeId;
    }
  }

  return recommended;
}
