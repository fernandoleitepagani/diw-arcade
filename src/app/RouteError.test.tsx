import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../components/ui';
import { createEmptySave, persistSave, SaveV1Schema } from '../lib/storage';
import { createMemoryStorage, FIXED_NOW } from '../test/renderWithProgress';
import { ProgressProvider } from './ProgressProvider';
import { routes } from './router';

vi.mock('../features/stats/StatsPage', () => {
  throw new Error('Falha ao baixar o chunk da página');
});

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

const originalLocation = window.location;

function stubReload() {
  const reload = vi.fn();
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { reload },
  });
  return reload;
}

afterEach(() => {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: originalLocation,
  });
});

describe('RouteError', () => {
  it('renders a PT-BR alert inside the shell when a page chunk fails', async () => {
    renderAt('/estatisticas');

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Não foi possível carregar esta página',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Tentar de novo' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Voltar para a trilha' }),
    ).toHaveAttribute('href', '/');

    // v4: nav is now named Principal
    expect(
      screen.getByRole('navigation', { name: 'Principal' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Trilha' })).toBeInTheDocument();

    expect(screen.queryByText(/Unexpected Application Error/i)).toBeNull();
    expect(screen.queryByText(/Hey developer/i)).toBeNull();
  });

  it('moves focus to the heading and reloads when retrying', async () => {
    const reload = stubReload();
    const user = userEvent.setup();
    renderAt('/estatisticas');

    const heading = await screen.findByRole('heading', {
      level: 1,
      name: 'Não foi possível carregar esta página',
    });
    await waitFor(() => {
      expect(document.activeElement).toBe(heading);
    });

    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }));

    expect(reload).toHaveBeenCalledOnce();
  });
});
