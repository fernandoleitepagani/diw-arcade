import { useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { Aurora } from '../components/effects/Aurora/Aurora';
import { ClickSpark } from '../components/effects/ClickSpark/ClickSpark';
import { Hud } from '../features/hud/Hud';
import './Layout.css';

const NAV_LINKS = [
  { to: '/', label: 'Árvore', end: true },
  { to: '/revisao', label: 'Revisão' },
  { to: '/laboratorios', label: 'Laboratórios' },
  { to: '/estatisticas', label: 'Estatísticas' },
  { to: '/ajustes', label: 'Ajustes' },
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
      <div className="layout">
        <a className="layout__skip" href="#conteudo">
          Pular para o conteúdo
        </a>

        <header className="layout__header">
          <NavLink className="layout__brand" to="/">
            DIW Arcade
          </NavLink>
          <Hud />
        </header>

        <nav className="layout__nav" aria-label="Navegação principal">
          {NAV_LINKS.map(({ to, label, end }) => (
            <NavLink key={to} className="layout__link" end={end} to={to}>
              {label}
            </NavLink>
          ))}
        </nav>

        <main className="layout__main" id="conteudo" ref={mainRef} tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </ClickSpark>
  );
}
