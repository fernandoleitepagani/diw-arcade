import { Link } from 'react-router';
import { Card, Mascot } from '../components/ui';
import { usePageTitle } from './usePageTitle';
import './NotFoundPage.css';

export function NotFoundPage() {
  usePageTitle('Página não encontrada');

  return (
    <Card as="section" tone="accent" className="not-found">
      <Mascot
        mood="thinking"
        line="Esse caminho não existe. A trilha está logo ali."
        size={112}
      />
      <h1>Página não encontrada</h1>
      <Link className="not-found__link" to="/">
        Voltar para a trilha
      </Link>
    </Card>
  );
}
