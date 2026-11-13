import { screen, within } from '@testing-library/react';
import { Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { renderWithProgress } from '../test/renderWithProgress';
import { Layout } from './Layout';

function renderLayout() {
  return renderWithProgress(
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<p>Conteúdo</p>} />
      </Route>
    </Routes>,
  );
}

describe('Layout', () => {
  it('renders one main navigation with exactly Hoje, Trilha and Progresso', () => {
    renderLayout();

    const navs = screen.getAllByRole('navigation', {
      name: 'Navegação principal',
    });
    expect(navs).toHaveLength(1);
    const links = within(navs[0]).getAllByRole('link');
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

  it('keeps the skip link pointing at #conteudo', () => {
    renderLayout();

    expect(
      screen.getByRole('link', { name: 'Pular para o conteúdo' }),
    ).toHaveAttribute('href', '#conteudo');
  });

  it('drops the Aurora and ClickSpark effects', () => {
    const { container } = renderLayout();

    expect(container.querySelector('.aurora')).toBeNull();
    expect(container.querySelector('.click-spark')).toBeNull();
    expect(screen.getByText('Conteúdo')).toBeInTheDocument();
  });

  it('shows the HUD and the avatar menu in the header', () => {
    renderLayout();

    const header = screen.getByRole('banner');
    expect(within(header).getByText('Nv 1')).toBeInTheDocument();
    expect(
      within(header).getByRole('button', { name: 'Menu da conta' }),
    ).toBeInTheDocument();
  });

  it('keeps the brand out of the headings', () => {
    renderLayout();

    const brand = screen.getByRole('link', { name: 'DIW Arcade' });
    expect(brand.closest('h1, h2, h3, h4, h5, h6')).toBeNull();
  });
});
