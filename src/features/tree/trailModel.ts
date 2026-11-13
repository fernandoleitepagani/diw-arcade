import { LAB_IDS, NODES, UNITS, type LabId, type NodeId, type UnitId } from '../../content';
import type { ProgressContent } from '../../lib/progress/events';
import { getRecommendedNodeId } from '../../lib/progress/recommend';
import { getDueCountByNode } from '../../lib/progress/selectors';
import type { SaveV1 } from '../../lib/storage';
import { getNodeState, type NodeState } from './nodeState';
import { LAB_UNIT } from './projects';

export interface TrailNode {
  id: NodeId;
  /** Two-digit position in the whole trail, "01" to "20". */
  number: string;
  state: NodeState;
  due: number;
  recommended: boolean;
}

export interface TrailUnit {
  unitId: UnitId;
  nodes: TrailNode[];
  finished: boolean;
  current: boolean;
  projects: LabId[];
}

export function buildTrail(
  save: SaveV1,
  content: ProgressContent,
  now: Date,
): TrailUnit[] {
  const recommendedId = getRecommendedNodeId(save, content, now);
  const due = getDueCountByNode(save, content, now);
  const order = NODES.map((node) => node.id);

  const units = UNITS.map((unit) => {
    const nodes = unit.nodes.map((id): TrailNode => ({
      id,
      number: String(order.indexOf(id) + 1).padStart(2, '0'),
      state: getNodeState(save, id, content),
      due: due[id] ?? 0,
      recommended: id === recommendedId,
    }));
    return {
      unitId: unit.id,
      nodes,
      finished: nodes.every((node) => node.state === 'dominada'),
      current: false,
      projects: LAB_IDS.filter((labId) => LAB_UNIT[labId] === unit.id),
    };
  });

  const recommendedUnit = units.find((u) =>
    u.nodes.some((n) => n.recommended),
  );
  const current =
    recommendedUnit && !recommendedUnit.finished
      ? recommendedUnit
      : (units.find((u) => !u.finished) ?? units[units.length - 1]);
  if (current) current.current = true;
  return units;
}
