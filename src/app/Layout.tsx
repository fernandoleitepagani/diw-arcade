import { Suspense, useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { PageSkeleton } from '../components/ui';
import { Hud } from '../features/hud/Hud';
import { AvatarMenu } from './AvatarMenu';
import { ReviewIcon, StatsIcon, TreeIcon } from './NavIcons';
import './Layout.css';

const NAV_LINKS = [
  { to: '/hoje', label: 'Hoje', Icon: ReviewIcon },
  { to: '/trilha', label: 'Trilha', Icon: TreeIcon },
  { to: '/progresso', label: 'Progresso', Icon: StatsIcon },
];

export function Layout() {
  const mainRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();

  useEffect(() => {
    mainRef.current?.focus();
  }, [pathname]);

  return (
    <div className="shell">
        <a className="shell__skip" href="#conteudo">
          Pular para o conteúdo
        </a>

        <header className="shell__header">
          <NavLink className="shell__brand" to="/">
            DIW Arcade
          </NavLink>

          <nav className="shell__nav" aria-label="Navegação principal">
            {NAV_LINKS.map(({ to, label, Icon }) => (
              <NavLink key={to} className="shell__link" to={to}>
                <Icon className="shell__icon" />
                <span className="shell__label">{label}</span>
              </NavLink>
            ))}
          </nav>

          <Hud />
          <AvatarMenu />
        </header>

        <main
          className="l-container shell__main"
          id="conteudo"
          ref={mainRef}
          tabIndex={-1}
        >
          <Suspense fallback={<PageSkeleton />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
  );
}
