import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { ToastProvider } from '../components/ui';
import {
  createEmptySave,
  persistSave,
  type SaveV1,
  type StorageLike,
} from '../lib/storage';
import { createMemoryStorage, FIXED_NOW } from '../test/renderWithProgress';
import { ProgressProvider } from './ProgressProvider';
import { routes } from './router';

function onboardedStorage(): StorageLike {
  const storage = createMemoryStorage();
  const save: SaveV1 = { ...createEmptySave(FIXED_NOW), onboarded: true };
  persistSave(storage, save);
  return storage;
}

function renderApp(path: string, storage: StorageLike) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <ToastProvider>
      <ProgressProvider storage={storage} clock={() => FIXED_NOW}>
        <RouterProvider router={router} />
      </ProgressProvider>
    </ToastProvider>,
  );
  return router;
}

const pages = [
  { path: '/hoje', heading: 'Hoje' },
  {
    path: '/trilha',
    // v4: Trilha has a visible h1 "Trilha" instead of the sr-only one.
    heading: 'Trilha',
    content: 'Introdução à Web e tecnologias',
  },
  { path: '/no/n07', heading: 'Propriedades CSS' },
  { path: '/no/n07/quiz', heading: 'Quiz' },
  { path: '/no/n07/cartas', heading: 'Cartas', content: 'Propriedades CSS' },
  { path: '/revisao', heading: 'Revisão' },
  {
    path: '/desafio/n07-c01',
    heading: 'Caixa com margem, borda e preenchimento',
  },
  {
    path: '/laboratorios/lab-01',
    heading: 'Laboratório',
    content: 'Laboratório 01 — Portfólio Profissional',
  },
  { path: '/progresso', heading: 'Progresso' },
  { path: '/ajustes', heading: 'Ajustes' },
] as const;

describe('smoke do app', () => {
  for (const { path, heading, ...rest } of pages) {
    const content = 'content' in rest ? rest.content : undefined;
    it(`renders the real h1 of ${path}`, async () => {
      renderApp(path, onboardedStorage());

      expect(
        await screen.findByRole('heading', { level: 1, name: heading }),
      ).toBeInTheDocument();
      if (content) {
        expect(screen.getAllByText(content).length).toBeGreaterThan(0);
      }
    });
  }

  it('shows the not found page for an unknown path', async () => {
    renderApp('/caminho-inexistente', onboardedStorage());

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Página não encontrada',
      }),
    ).toBeInTheDocument();
  });

  it('redirects a fresh save to /boas-vindas', async () => {
    const router = renderApp('/hoje', createMemoryStorage());

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/boas-vindas');
    });
    expect(
      await screen.findByText('Bem-vindo ao DIW Arcade'),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('button', { name: 'Regular, 50 XP' }),
    ).toBeInTheDocument();
  });
});
