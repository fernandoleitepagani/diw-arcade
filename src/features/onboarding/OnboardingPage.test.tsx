import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { ProgressProvider } from '../../app/ProgressProvider';
import { routes } from '../../app/router';
import { ToastProvider } from '../../components/ui';
import {
  SAVE_KEY,
  SaveV1Schema,
  createEmptySave,
  persistSave,
  type SaveV1,
  type StorageLike,
} from '../../lib/storage';
import {
  FIXED_NOW,
  createMemoryStorage,
} from '../../test/renderWithProgress';

function renderApp(path: string, onboarded: boolean) {
  const storage = createMemoryStorage();
  persistSave(
    storage,
    SaveV1Schema.parse({ ...createEmptySave(FIXED_NOW), onboarded }),
  );

  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <ToastProvider>
      <ProgressProvider storage={storage} clock={() => FIXED_NOW}>
        <RouterProvider router={router} />
      </ProgressProvider>
    </ToastProvider>,
  );

  return { router, storage };
}

function readSave(storage: StorageLike): SaveV1 {
  const raw = storage.getItem(SAVE_KEY);
  if (raw === null) throw new Error('save não encontrado');
  return SaveV1Schema.parse(JSON.parse(raw));
}

describe('OnboardingPage', () => {
  it('redireciona uma sessão nova de / para /boas-vindas', async () => {
    const { router } = renderApp('/', false);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/boas-vindas');
    });

    expect(screen.getByText('Bem-vindo ao DIW Arcade')).toBeInTheDocument();
    expect(
      screen.getByText(/Eu sou o Bit/),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Quanto quer treinar por dia?'),
    ).toBeInTheDocument();
  });

  it('Tab e Enter em Intenso definem a meta 100 e levam à árvore', async () => {
    const user = userEvent.setup();
    const { router, storage } = renderApp('/', false);

    const regular = await screen.findByRole('button', {
      name: 'Regular · 50 XP',
    });
    await waitFor(() => expect(regular).toHaveFocus());

    await user.tab();
    expect(
      screen.getByRole('button', { name: 'Intenso · 100 XP' }),
    ).toHaveFocus();

    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/');
    });
    expect(
      screen.getByRole('heading', { level: 1, name: 'DIW Arcade' }),
    ).toBeInTheDocument();

    const save = readSave(storage);
    expect(save.onboarded).toBe(true);
    expect(save.settings.dailyGoal).toBe(100);
  });

  it('Esc pula a escolha e mantém a meta padrão 50', async () => {
    const user = userEvent.setup();
    const { router, storage } = renderApp('/', false);

    await screen.findByRole('button', { name: 'Regular · 50 XP' });
    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/');
    });

    const save = readSave(storage);
    expect(save.onboarded).toBe(true);
    expect(save.settings.dailyGoal).toBe(50);
  });

  it('Pular conclui o onboarding sem trocar a meta', async () => {
    const user = userEvent.setup();
    const { router, storage } = renderApp('/', false);

    await user.click(await screen.findByRole('button', { name: 'Pular' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/');
    });

    const save = readSave(storage);
    expect(save.onboarded).toBe(true);
    expect(save.settings.dailyGoal).toBe(50);
  });

  it('redireciona /boas-vindas para / quando o onboarding já foi feito', async () => {
    const { router } = renderApp('/boas-vindas', true);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/');
    });
    expect(
      screen.getByRole('heading', { level: 1, name: 'DIW Arcade' }),
    ).toBeInTheDocument();
  });
});
