import { useEffect, useState } from 'react';
import type { NodeId, Primer } from '../../content';
import { getPrimer, hasPrimer } from '../../content/primers';

/** Loads the node primer lazily; undefined while loading or when absent. */
export function usePrimer(nodeId: NodeId | undefined): Primer | undefined {
  const [loaded, setLoaded] = useState<{ nodeId: NodeId; primer: Primer }>();
  useEffect(() => {
    if (nodeId === undefined || !hasPrimer(nodeId)) return;
    let live = true;
    void getPrimer(nodeId).then((primer) => {
      if (live && primer) setLoaded({ nodeId, primer });
    });
    return () => {
      live = false;
    };
  }, [nodeId]);
  return loaded?.nodeId === nodeId ? loaded?.primer : undefined;
}
