import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { ToastProvider } from '../components/ui';
import { createEmptySave, persistSave, SaveV1Schema } from '../lib/storage';
import { createMemoryStorage, FIXED_NOW } from '../test/renderWithProgress';
import { ProgressProvider } from './ProgressProvider';
import { routes } from './router';

function renderAt(path: string, onboarded: boolean) {
  const storage = createMemoryStorage();
  if (onboarded) {
    persistSave(
      storage,
      SaveV1Schema.parse({ ...createEmptySave(FIXED_NOW), onboarded: true }),
    );
  }
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

const landingH1 = { level: 1 } as const;

describe('home route', () => {
  it('fresh / shows the landing with a CTA to /boas-vindas', async () => {
    const router = renderAt('/', false);
    expect(await screen.findByRole('heading', landingH1)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
    expect(screen.getAllByRole('link', { name: /Começar/ })[0]).toHaveAttribute(
      'href',
      '/boas-vindas',
    );
  });

  it('onboarded / redirects to /hoje', async () => {
    const router = renderAt('/', true);
    await waitFor(() => expect(router.state.location.pathname).toBe('/hoje'));
  });

  it('onboarded /?inicio shows the landing with a CTA to /hoje', async () => {
    const router = renderAt('/?inicio', true);
    expect(await screen.findByRole('heading', landingH1)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
    expect(screen.getAllByRole('link', { name: /Começar/ })[0]).toHaveAttribute(
      'href',
      '/hoje',
    );
  });

  it('brand link opens /?inicio', async () => {
    renderAt('/hoje', true);
    expect(
      await screen.findByRole('link', { name: 'DIW Arcade' }),
    ).toHaveAttribute('href', '/?inicio');
  });

  it('brand link leads to the landing', async () => {
    const user = userEvent.setup();
    renderAt('/hoje', true);
    await user.click(await screen.findByRole('link', { name: 'DIW Arcade' }));
    expect(
      (await screen.findAllByRole('link', { name: /Começar/ })).length,
    ).toBeGreaterThan(0);
  });

  it('fresh /hoje still goes to /boas-vindas', async () => {
    const router = renderAt('/hoje', false);
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/boas-vindas'),
    );
  });
});
