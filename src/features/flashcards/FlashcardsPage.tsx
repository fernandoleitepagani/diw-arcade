import { useParams } from 'react-router';
import { usePageTitle } from '../../app/usePageTitle';

export function FlashcardsPage() {
  const { nodeId } = useParams();
  const heading = nodeId ? 'Cartas' : 'Revisão';
  usePageTitle(heading);

  return (
    <section className="page">
      <h1>{heading}</h1>
      <p>Em construção</p>
    </section>
  );
}
