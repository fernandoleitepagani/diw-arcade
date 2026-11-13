import { Suspense, useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { ConfirmDialog } from '../components/session';
import {
  SessionBarProvider,
  useSessionBarState,
} from '../components/session/sessionBar';
import { PageSkeleton } from '../components/ui';
import { Button } from '../components/pixel/Button/Button';
import { PixelIcon } from '../components/pixel/PixelIcon/PixelIcon';
import { SegBar } from '../components/pixel/SegBar/SegBar';
import './SessionLayout.css';

const DEFAULT_EXIT = '/';

function SessionChrome() {
  const { value, max, exitTo, confirmExit } = useSessionBarState();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    mainRef.current?.focus();
  }, [pathname]);

  function leave(): void {
    if (confirmExit) {
      setConfirming(true);
      return;
    }

    navigate(exitTo || DEFAULT_EXIT);
  }

  function confirmLeave(): void {
    setConfirming(false);
    navigate(exitTo || DEFAULT_EXIT);
  }

  return (
    <div className="session-layout">
      <a className="session-layout__skip" href="#conteudo">
        Pular para o conteúdo
      </a>

      <header className="session-layout__bar">
        <Button
          variant="quiet"
          className="session-layout__close"
          aria-label="Sair da sessão"
          onClick={leave}
        >
          <PixelIcon name="x" scale={2} />
        </Button>
        <div className="session-layout__progress">
          <SegBar
            on={Math.min(value, max)}
            total={max}
            label="Progresso da sessão"
          />
        </div>
      </header>

      <main
        className="session-layout__main"
        id="conteudo"
        ref={mainRef}
        tabIndex={-1}
      >
        <Suspense fallback={<PageSkeleton />}>
          <Outlet />
        </Suspense>
      </main>

      <ConfirmDialog
        open={confirming}
        title={confirmExit?.title ?? ''}
        message={confirmExit?.message ?? ''}
        confirmLabel="Sair"
        cancelLabel="Continuar rodada"
        onConfirm={confirmLeave}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}

/**
 * Focused route shell for quiz, cards, review and challenge sessions: no main
 * navigation, a slim bar with the session progress and an exit control, and a
 * confirmation step when the active page asks for one.
 */
export function SessionLayout() {
  return (
    <SessionBarProvider>
      <SessionChrome />
    </SessionBarProvider>
  );
}
