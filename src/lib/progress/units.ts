import { UNITS, type UnitId } from '../../content/tree';
import type { ProgressContent } from './events';
import { getStarCount, getStars } from './selectors';
import type { SaveV1 } from '../storage/schema';

/**
 * Units in which every node has all three stars. Units are listed in the
 * canonical course order.
 */
export function getCompletedUnitIds(
  save: SaveV1,
  content: ProgressContent = {},
): UnitId[] {
  return UNITS.filter((unit) =>
    unit.nodes.every(
      (nodeId) => getStarCount(getStars(save, nodeId, content)) === 3,
    ),
  ).map((unit) => unit.id);
}
