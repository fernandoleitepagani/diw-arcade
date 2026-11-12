import { Link } from 'react-router';
import { usePageTitle } from './usePageTitle';

export function NotFoundPage() {
  usePageTitle('Página não encontrada');

  return (
    <section className="page">
      <h1>Página não encontrada</h1>
      <p>O endereço que você tentou abrir não existe.</p>
      <p>
        <Link to="/">Voltar para a árvore</Link>
      </p>
    </section>
  );
}
