import { hasPrimer } from '../../content/primers';
import { NODES, UNITS, type NodeId, type UnitId } from '../../content';
import type { ProgressContent } from '../../lib/progress/events';
import { getLessonSteps, LESSON_STEP_IDS } from '../../lib/progress/lessonSteps';
import { getRecommendedNodeId } from '../../lib/progress/recommend';
import { getPrimersRead } from '../../lib/progress/selectors';
import type { SaveV1 } from '../../lib/storage';
import { getNodeState, type NodeState } from './nodeState';

export interface TrailNode {
  id: NodeId;
  /** Two-digit position in the whole trail, "01" to "20". */
  number: string;
  state: NodeState;
  recommended: boolean;
}

export interface TrailUnit {
  unitId: UnitId;
  nodes: TrailNode[];
  finished: boolean;
  current: boolean;
}

export function buildTrail(
  save: SaveV1,
  content: ProgressContent,
  now: Date,
): TrailUnit[] {
  const recommendedId = getRecommendedNodeId(save, content, now);
  const order = NODES.map((node) => node.id);

  const units = UNITS.map((unit) => {
    const nodes = unit.nodes.map((id): TrailNode => ({
      id,
      number: String(order.indexOf(id) + 1).padStart(2, '0'),
      state: getNodeState(save, id, content),
      recommended: id === recommendedId,
    }));
    return {
      unitId: unit.id,
      nodes,
      finished: nodes.every((node) => node.state === 'dominada'),
      current: false,
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

/** Lesson steps (ler, praticar, fixar, construir) already done on a node. */
export function getStepsDone(
  save: SaveV1,
  nodeId: NodeId,
  content: ProgressContent,
): number {
  const steps = getLessonSteps(save, nodeId, content, {
    hasPrimer: hasPrimer(nodeId),
    primersRead: getPrimersRead(save) as ReadonlySet<NodeId>,
  });
  return LESSON_STEP_IDS.filter((id) => steps[id] === 'feito').length;
}

/** Winding position of each disc, 0 to 1 of the path width (prototype values). */
const WIND = [
  0.5, 0.793, 0.35, 0.62, 0.84, 0.841, 0.603, 0.28, 0.14, 0.302, 0.629, 0.848,
  0.776, 0.473, 0.192, 0.169, 0.423, 0.741, 0.858, 0.675,
] as const;

const UNIT_HEAD = 56;
const NODE_PITCH = 72;
const UNIT_GAP = 80;
const NODE_HEIGHT = 56;

export interface TrailLayout {
  height: number;
  /** Cubic path through every disc, in a `0 0 100 height` viewBox. */
  path: string;
  unitTop: Record<string, number>;
  node: Record<string, { top: number; f: number }>;
}

/** Absolute positions for the unit headers and discs, top to bottom. */
export function layoutTrail(trail: readonly TrailUnit[]): TrailLayout {
  const unitTop: TrailLayout['unitTop'] = {};
  const node: TrailLayout['node'] = {};
  const points: Array<[number, number]> = [];
  let y = 0;
  let index = 0;
  for (const unit of trail) {
    unitTop[unit.unitId] = y;
    let top = y + UNIT_HEAD;
    for (const item of unit.nodes) {
      const f = WIND[index % WIND.length]!;
      node[item.id] = { top, f };
      points.push([f * 100, top + NODE_HEIGHT / 2]);
      index += 1;
      top += NODE_PITCH;
    }
    y = top - NODE_PITCH + UNIT_GAP;
  }
  const height = y - UNIT_GAP + NODE_HEIGHT;
  return { height, path: smoothPath(points), unitTop, node };
}

/** Catmull-Rom through the points, written as cubic Bezier segments. */
function smoothPath(points: ReadonlyArray<[number, number]>): string {
  const first = points[0];
  if (!first) return '';
  const fmt = (n: number) => n.toFixed(1);
  let d = `M${fmt(first[0])} ${fmt(first[1])}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i]!;
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const p3 = points[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${fmt(c1[0]!)} ${fmt(c1[1]!)} ${fmt(c2[0]!)} ${fmt(c2[1]!)} ${fmt(p2[0])} ${fmt(p2[1])}`;
  }
  return d;
}
