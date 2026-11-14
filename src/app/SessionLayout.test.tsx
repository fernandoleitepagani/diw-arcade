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

function UnitSession() {
  useSessionBar({ value: 2, max: 3, exitTo: '/', unit: 'requisitos' });

  return <h1>Sessão com unidade</h1>;
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
        screen.getByRole('heading', { level: 1, name: 'Hoje' }),
      ).toBeInTheDocument(),
    );
  });

  it('keeps a single quiz progress bar and puts the header in the content column', async () => {
    const { container } = renderAt('/no/n07/quiz');

    const heading = await screen.findByRole('heading', {
      level: 1,
      name: 'Quiz',
    });
    const bars = screen.getAllByRole('progressbar');
    expect(bars).toHaveLength(1);
    expect(bars[0]).toHaveAccessibleName('Progresso da sessão');
    await waitFor(() =>
      expect(bars[0]).toHaveAttribute('aria-valuenow', '1'),
    );
    const column = heading.closest('.session-page');
    expect(column).not.toBeNull();
    expect(column).toContainElement(container.querySelector('.quiz-round'));
  });

  it('shows the "n de m" counter next to the segmented bar', async () => {
    renderConfirmingSession();

    expect(await screen.findByText('1 de 4')).toBeInTheDocument();
  });

  it('appends the unit to the counter when the session gives one', async () => {
    const router = createMemoryRouter(
      [
        {
          element: <SessionLayout />,
          children: [{ path: '/', element: <UnitSession /> }],
        },
      ],
      { initialEntries: ['/'] },
    );
    render(<RouterProvider router={router} />);

    expect(await screen.findByText('2 de 3 requisitos')).toBeInTheDocument();
  });

  it('puts the flashcards header in the content column', async () => {
    const { container } = renderAt('/no/n07/cartas');

    const heading = await screen.findByRole('heading', {
      level: 1,
      name: 'Cartas',
    });
    const column = heading.closest('.session-page');
    expect(column).not.toBeNull();
    expect(column).toContainElement(
      container.querySelector('.flashcard-session'),
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

  it('uses a segmented progress bar and keeps the main focus target', async () => {
    const { container } = renderConfirmingSession();

    expect(container.querySelectorAll('.seg i')).toHaveLength(4);
    expect(
      screen.getByRole('progressbar', { name: 'Progresso da sessão' }),
    ).toHaveAttribute('aria-valuenow', '1');
    expect(
      screen.getByRole('link', { name: 'Pular para o conteúdo' }),
    ).toHaveAttribute('href', '#conteudo');
    await waitFor(() =>
      expect(container.querySelector('#conteudo')).toHaveFocus(),
    );
  });
});
