import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { ToastProvider } from '../components/ui';
import { createEmptySave, persistSave, SaveV1Schema } from '../lib/storage';
import { createMemoryStorage, FIXED_NOW } from '../test/renderWithProgress';
import { ProgressProvider } from './ProgressProvider';
import { routes } from './router';

function renderAt(path: string) {
  const storage = createMemoryStorage();
  persistSave(
    storage,
    SaveV1Schema.parse({ ...createEmptySave(FIXED_NOW), onboarded: true }),
  );
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  return render(
    <ToastProvider>
      <ProgressProvider storage={storage} clock={() => FIXED_NOW}>
        <RouterProvider router={router} />
      </ProgressProvider>
    </ToastProvider>,
  );
}

const pages = [
  { path: '/', heading: 'DIW Arcade' },
  { path: '/no/n01', heading: 'Nó' },
  { path: '/no/n01/quiz', heading: 'Quiz' },
  { path: '/no/n01/cartas', heading: 'Cartas' },
  { path: '/revisao', heading: 'Revisão' },
  { path: '/desafio/n01-c01', heading: 'Minha primeira página HTML' },
  { path: '/laboratorios', heading: 'Laboratórios' },
  { path: '/laboratorios/lab-01', heading: 'Laboratório' },
  { path: '/estatisticas', heading: 'Estatísticas' },
  { path: '/ajustes', heading: 'Ajustes' },
] as const;

describe('rotas', () => {
  for (const { path, heading } of pages) {
    it(`renders the h1 of ${path}`, () => {
      renderAt(path);

      expect(
        screen.getByRole('heading', { level: 1, name: heading }),
      ).toBeInTheDocument();
    });
  }

  it('shows the not found page for an unknown path', () => {
    renderAt('/caminho-inexistente');

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Página não encontrada',
      }),
    ).toBeInTheDocument();
  });

  it('points the skip link at #conteudo', () => {
    renderAt('/');

    expect(
      screen.getByRole('link', { name: 'Pular para o conteúdo' }),
    ).toHaveAttribute('href', '#conteudo');
  });

  it('marks the active nav link with aria-current', () => {
    renderAt('/revisao');

    expect(screen.getByRole('link', { name: 'Revisão' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: 'Árvore' })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('sets the page title with the app prefix', () => {
    renderAt('/revisao');

    expect(document.title).toBe('DIW Arcade — Revisão');
  });

  it('moves focus to the main content on navigation', async () => {
    const user = userEvent.setup();
    renderAt('/');

    await user.click(screen.getByRole('link', { name: 'Ajustes' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Ajustes' })).toBeInTheDocument();
      expect(document.activeElement).toBe(screen.getByRole('main'));
    });
  });
});
