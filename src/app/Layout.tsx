import { Suspense, useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { PixelIcon } from '../components/pixel/PixelIcon/PixelIcon';
import { ThemeToggle } from '../components/pixel/ThemeToggle/ThemeToggle';
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
          <div className="shell__header-in">
            <NavLink className="shell__brand" to="/?inicio">
              <PixelIcon name="prompt" scale={3} />
              DIW Arcade
            </NavLink>

            <nav className="shell__nav" aria-label="Principal">
              {NAV_LINKS.map(({ to, label, Icon }) => (
                <NavLink key={to} className="shell__link" to={to}>
                  <span className="shell__cursor">
                    <PixelIcon name="cursor" />
                  </span>
                  <span className="shell__icon">
                    <Icon />
                  </span>
                  <span className="shell__label">{label}</span>
                </NavLink>
              ))}
            </nav>

            <div className="shell__stat">
              <Hud />
              <ThemeToggle />
              <AvatarMenu />
            </div>
          </div>
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
