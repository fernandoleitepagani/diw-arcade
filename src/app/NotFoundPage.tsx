import { Link } from 'react-router';
import { Bit } from '../components/pixel/Bit/Bit';
import { PixelPanel } from '../components/pixel/PixelPanel/PixelPanel';
import { usePageTitle } from './usePageTitle';
import './NotFoundPage.css';

export function NotFoundPage() {
  usePageTitle('Página não encontrada');

  return (
    <PixelPanel as="section" className="not-found">
      <Bit line="Esse caminho não existe. A trilha está logo ali." scale={14} />
      <h1>Página não encontrada</h1>
      <Link className="not-found__link" to="/">
        Voltar para a trilha
      </Link>
    </PixelPanel>
  );
}
