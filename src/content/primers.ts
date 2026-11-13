import { PrimerSchema, type Primer } from './schema';
import type { NodeId } from './tree';

const loaders = import.meta.glob<unknown>('./n*/primers.json', {
  import: 'default',
});

function pathFor(nodeId: NodeId): string {
  return `./${nodeId}/primers.json`;
}

/** Synchronous and cheap: only checks which files exist, loads nothing. */
export function hasPrimer(nodeId: NodeId): boolean {
  return Object.hasOwn(loaders, pathFor(nodeId));
}

/** Lazily loads and validates the node primer; undefined when none exists. */
export async function getPrimer(nodeId: NodeId): Promise<Primer | undefined> {
  const load = loaders[pathFor(nodeId)];
  if (load === undefined) return undefined;
  return PrimerSchema.parse(await load());
}
