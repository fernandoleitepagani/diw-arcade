import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { renderWithProgress } from '../test/renderWithProgress';
import { Layout } from './Layout';

function renderLayout(route?: string) {
  return renderWithProgress(
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<p>Conteúdo</p>} />
        <Route path="no/:nodeId" element={<p>Nó</p>} />
        <Route path="hoje" element={<p>Hoje</p>} />
      </Route>
    </Routes>,
    route ? { route } : undefined,
  );
}

describe('Layout', () => {
  it('renders one main navigation with exactly Hoje, Trilha and Progresso', () => {
    renderLayout();

    // v4: AC6 renames the single nav to "Principal"
    const navs = screen.getAllByRole('navigation', {
      name: 'Principal',
    });
    expect(navs).toHaveLength(1);
    const links = within(navs[0]!).getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual([
      'Hoje',
      'Trilha',
      'Progresso',
    ]);
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/hoje',
      '/trilha',
      '/progresso',
    ]);
  });

  it('marks Trilha current on a node route, and only Trilha', () => {
    renderLayout('/no/n01');

    const nav = screen.getByRole('navigation', { name: 'Principal' });
    const current = within(nav)
      .getAllByRole('link')
      .filter((link) => link.hasAttribute('aria-current'));
    expect(current.map((link) => link.textContent)).toEqual(['Trilha']);
  });

  it('marks Hoje current on /hoje', () => {
    renderLayout('/hoje');

    const nav = screen.getByRole('navigation', { name: 'Principal' });
    expect(within(nav).getByRole('link', { name: 'Hoje' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('keeps the skip link pointing at #conteudo', () => {
    renderLayout();

    expect(
      screen.getByRole('link', { name: 'Pular para o conteúdo' }),
    ).toHaveAttribute('href', '#conteudo');
  });

  it('drops the ambient background and spark effects', () => {
    const { container } = renderLayout();

    expect(container.querySelector('.aurora')).toBeNull();
    expect(container.querySelector('.click-spark')).toBeNull();
    expect(screen.getByText('Conteúdo')).toBeInTheDocument();
  });

  it('shows the HUD and the avatar menu in the header', () => {
    renderLayout();

    const header = screen.getByRole('banner');
    // v4: the HUD now reads "nível N"
    expect(within(header).getByText('nível 1')).toBeInTheDocument();
    expect(
      within(header).getByRole('button', { name: 'Menu da conta' }),
    ).toBeInTheDocument();
  });

  it('keeps the brand out of the headings', () => {
    renderLayout();

    const brand = screen.getByRole('link', { name: 'DIW Arcade' });
    expect(brand.closest('h1, h2, h3, h4, h5, h6')).toBeNull();
  });

  it('has the theme toggle and a brand link with the pixel logo', () => {
    renderLayout();

    const header = screen.getByRole('banner');
    expect(
      within(header).getByRole('button', {
        name: 'Alternar tema claro e escuro',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'DIW Arcade' }).querySelector('svg'),
    ).not.toBeNull();
  });

  it('moves focus to main after navigating', async () => {
    const user = userEvent.setup();
    renderWithProgress(
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Link to="/outra">Ir</Link>} />
          <Route path="outra" element={<p>Outra</p>} />
        </Route>
      </Routes>,
    );

    await user.click(screen.getByRole('link', { name: 'Ir' }));

    expect(screen.getByRole('main')).toHaveFocus();
  });
});
