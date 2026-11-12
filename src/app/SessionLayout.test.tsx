import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { useSessionBar } from '../components/session';
import { ToastProvider } from '../components/ui';
import {
  SaveV1Schema,
  createEmptySave,
  persistSave,
} from '../lib/storage';
import { createMemoryStorage, FIXED_NOW } from '../test/renderWithProgress';
import { ProgressProvider } from './ProgressProvider';
import { routes } from './router';
import { SessionLayout } from './SessionLayout';

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

function ConfirmingSession() {
  useSessionBar({
    value: 1,
    max: 4,
    exitTo: '/destino',
    confirmExit: {
      title: 'Sair da rodada?',
      message: 'O progresso desta rodada será perdido.',
    },
  });

  return <h1>Sessão de teste</h1>;
}

function renderConfirmingSession() {
  const router = createMemoryRouter(
    [
      { path: '/', element: <h1>Início</h1> },
      {
        element: <SessionLayout />,
        children: [{ path: 'sessao', element: <ConfirmingSession /> }],
      },
      { path: '/destino', element: <h1>Destino</h1> },
    ],
    { initialEntries: ['/sessao'] },
  );

  return render(<RouterProvider router={router} />);
}

describe('SessionLayout', () => {
  it('drops the main nav and exits to / by default', async () => {
    const user = userEvent.setup();
    renderAt('/no/n07/quiz');

    expect(
      screen.queryByRole('navigation', { name: 'Navegação principal' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('progressbar', { name: 'Progresso da sessão' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Sair da sessão' }));

    await waitFor(() =>
      expect(
        screen.getByRole('heading', { level: 1, name: 'DIW Arcade' }),
      ).toBeInTheDocument(),
    );
  });

  it('asks for confirmation before leaving when the page requests it', async () => {
    const user = userEvent.setup();
    renderConfirmingSession();

    await user.click(screen.getByRole('button', { name: 'Sair da sessão' }));

    expect(
      screen.getByRole('dialog', { name: 'Sair da rodada?' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Continuar rodada' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Sessão de teste' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Sair da sessão' }));
    await user.click(screen.getByRole('button', { name: 'Sair' }));

    await waitFor(() =>
      expect(
        screen.getByRole('heading', { level: 1, name: 'Destino' }),
      ).toBeInTheDocument(),
    );
  });
});
