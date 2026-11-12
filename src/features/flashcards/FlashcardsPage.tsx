import { useMemo } from 'react';
import { Link, useParams } from 'react-router';
import { usePageTitle } from '../../app/usePageTitle';
import {
  NODE_IDS,
  getFlashcards,
  getNode,
  type NodeId,
} from '../../content';
import { FlashcardSession } from './FlashcardSession';

function toNodeId(value: string | undefined): NodeId | undefined {
  if (value === undefined) return undefined;
  return (NODE_IDS as readonly string[]).includes(value)
    ? (value as NodeId)
    : undefined;
}

export function FlashcardsPage() {
  const { nodeId: rawNodeId } = useParams();
  const hasNodeRoute = rawNodeId !== undefined;
  const heading = hasNodeRoute ? 'Cartas' : 'Revisão';
  usePageTitle(heading);

  const nodeId = toNodeId(rawNodeId);
  const node = nodeId ? getNode(nodeId) : undefined;

  const flashcards = useMemo(() => {
    if (!hasNodeRoute) {
      return NODE_IDS.flatMap((id) => getFlashcards(id));
    }
    return nodeId ? getFlashcards(nodeId) : [];
  }, [hasNodeRoute, nodeId]);

  if (hasNodeRoute && node === undefined) {
    return (
      <section className="page">
        <h1>{heading}</h1>
        <p>Nó não encontrado.</p>
        <Link to="/">Voltar para a árvore</Link>
      </section>
    );
  }

  return (
    <section className="page">
      <h1>{heading}</h1>
      {node ? <p>{node.title}</p> : null}
      <FlashcardSession key={node?.id ?? 'revisao'} flashcards={flashcards} />
    </section>
  );
}
