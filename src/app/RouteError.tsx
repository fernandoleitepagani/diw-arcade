import { useEffect, useRef } from 'react';
import { Bit } from '../components/pixel/Bit/Bit';
import { Button, ButtonLink } from '../components/pixel/Button/Button';
import { PixelPanel } from '../components/pixel/PixelPanel/PixelPanel';
import './RouteError.css';

/**
 * Error boundary for a single page route: keeps the surrounding shell (and its
 * navigation) mounted and offers a retry when a page chunk fails to load.
 */
export function RouteError() {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    // The shell focuses <main> after its children's effects, so defer a tick
    // to make sure the error heading wins the initial focus.
    const timeout = window.setTimeout(() => headingRef.current?.focus(), 0);
    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <PixelPanel as="section" className="route-error" role="alert">
      <h1 ref={headingRef} tabIndex={-1}>
        Não foi possível carregar esta página
      </h1>
      <p className="route-error__text">
        A página não carregou. Pode ter sido a conexão ou uma atualização do
        site. Seu progresso continua salvo.
      </p>
      <Bit
        line="Deu um curto no meu circuito. Bora tentar mais uma vez?"
        scale={14}
      />
      <div className="route-error__actions">
        <Button onClick={() => window.location.reload()}>Tentar de novo</Button>
        <ButtonLink to="/" variant="quiet">
          Voltar para a trilha
        </ButtonLink>
      </div>
    </PixelPanel>
  );
}
