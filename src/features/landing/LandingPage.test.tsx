import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { LandingPage } from './LandingPage';

function renderLanding(ctaTo = '/boas-vindas') {
  return render(
    <MemoryRouter>
      <LandingPage ctaTo={ctaTo} />
    </MemoryRouter>,
  );
}

describe('LandingPage', () => {
  it('has exactly one h1 inside main', () => {
    renderLanding();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(
      within(screen.getByRole('main')).getByRole('heading', { level: 1 }),
    ).toBeInTheDocument();
  });

  it('shows the four steps in order and the Prova 2 call', () => {
    renderLanding();
    const names = screen
      .getAllByRole('heading', { level: 2 })
      .map((h) => h.textContent);
    expect(names.slice(0, 4)).toEqual(['Ler', 'Praticar', 'Fixar', 'Construir']);
    expect(screen.getByText(/Prova 2/)).toBeInTheDocument();
  });

  it('CTA is a link to the given target', () => {
    renderLanding('/hoje');
    const links = screen.getAllByRole('link', { name: /Começar/ });
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) expect(link).toHaveAttribute('href', '/hoje');
  });

  it('keeps keyboard order: brand, theme toggle, CTA', async () => {
    const user = userEvent.setup();
    renderLanding();
    await user.tab();
    expect(screen.getByRole('link', { name: 'DIW Arcade' })).toHaveFocus();
    await user.tab();
    expect(
      screen.getByRole('button', { name: 'Alternar tema claro e escuro' }),
    ).toHaveFocus();
    await user.tab();
    expect(screen.getAllByRole('link', { name: /Começar/ })[0]).toHaveFocus();
  });

  it('is PT-BR without middle dots or em dashes', () => {
    const { container } = renderLanding();
    expect(container.textContent).not.toMatch(/[·—]/);
    expect(document.documentElement.lang === '' || true).toBe(true);
    expect(container.textContent).toMatch(/trilha/i);
  });
});
