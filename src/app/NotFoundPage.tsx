import { Bit } from '../components/pixel/Bit/Bit';
import { ButtonLink } from '../components/pixel/Button/Button';
import { PixelPanel } from '../components/pixel/PixelPanel/PixelPanel';
import { usePageTitle } from './usePageTitle';
import './NotFoundPage.css';

export function NotFoundPage() {
  usePageTitle('Página não encontrada');

  return (
    <PixelPanel as="section" className="not-found">
      <Bit line="Esse caminho não existe. A trilha está logo ali." scale={14} />
      <h1>Página não encontrada</h1>
      <ButtonLink to="/">Voltar para a trilha</ButtonLink>
    </PixelPanel>
  );
}
