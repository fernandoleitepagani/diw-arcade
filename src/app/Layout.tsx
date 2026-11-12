import { useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { Aurora } from '../components/effects/Aurora/Aurora';
import { ClickSpark } from '../components/effects/ClickSpark/ClickSpark';
import { Hud } from '../features/hud/Hud';
import {
  LabIcon,
  ReviewIcon,
  SettingsIcon,
  StatsIcon,
  TreeIcon,
} from './NavIcons';
import './Layout.css';

const NAV_LINKS = [
  { to: '/', label: 'Árvore', end: true, Icon: TreeIcon },
  { to: '/revisao', label: 'Revisão', Icon: ReviewIcon },
  { to: '/laboratorios', label: 'Laboratórios', Icon: LabIcon },
  { to: '/estatisticas', label: 'Estatísticas', Icon: StatsIcon },
  { to: '/ajustes', label: 'Ajustes', Icon: SettingsIcon },
];

export function Layout() {
  const mainRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();

  useEffect(() => {
    mainRef.current?.focus();
  }, [pathname]);

  return (
    <ClickSpark>
      <Aurora />
      <div className="shell">
        <a className="shell__skip" href="#conteudo">
          Pular para o conteúdo
        </a>

        <header className="shell__side">
          <NavLink className="shell__brand" to="/">
            DIW Arcade
          </NavLink>

          <Hud />

          <nav className="shell__nav" aria-label="Navegação principal">
            {NAV_LINKS.map(({ to, label, end, Icon }) => (
              <NavLink
                key={to}
                className="shell__link"
                end={end}
                to={to}
              >
                <Icon className="shell__icon" />
                <span className="shell__label">{label}</span>
              </NavLink>
            ))}
          </nav>
        </header>

        <main
          className="l-container shell__main"
          id="conteudo"
          ref={mainRef}
          tabIndex={-1}
        >
          <Outlet />
        </main>
      </div>
    </ClickSpark>
  );
}
