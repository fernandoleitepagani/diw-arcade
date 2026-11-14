import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { UNITS } from '../../content/tree';
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
    // v4: "Prova 2" is now also a unit row, so match the end heading by role.
    expect(
      screen.getByRole('heading', { level: 2, name: 'Chegue na Prova 2' }),
    ).toBeInTheDocument();
  });

  it('CTA is a link to the given target', () => {
    renderLanding('/hoje');
    const links = screen.getAllByRole('link', { name: /Começar/ });
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) expect(link).toHaveAttribute('href', '/hoje');
  });

  it('keeps keyboard order: brand, theme toggle, Entrar, CTA', async () => {
    const user = userEvent.setup();
    renderLanding();
    await user.tab();
    expect(screen.getByRole('link', { name: 'DIW Arcade' })).toHaveFocus();
    await user.tab();
    expect(
      screen.getByRole('button', { name: 'Alternar tema claro e escuro' }),
    ).toHaveFocus();
    // v4: the header now carries an "Entrar" link between the toggle and the CTA.
    await user.tab();
    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveFocus();
    await user.tab();
    expect(screen.getAllByRole('link', { name: /Começar/ })[0]).toHaveFocus();
  });

  it('is PT-BR without middle dots or em dashes', () => {
    const { container } = renderLanding();
    expect(container.textContent).not.toMatch(/[·—]/);
    expect(container.textContent).toMatch(/trilha/i);
  });

  it('matches the prototype landing copy and links', () => {
    renderLanding('/hoje');
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Aprenda interfaces web zerando a trilha.',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute(
      'href',
      '/hoje',
    );
    expect(
      screen.getAllByRole('link', { name: 'Começar a trilha' }),
    ).toHaveLength(2);
    expect(
      screen.getByRole('link', { name: 'Ver como funciona' }),
    ).toHaveAttribute('href', '#como');
    expect(
      screen.getByRole('button', { name: 'Alternar tema claro e escuro' }),
    ).toBeInTheDocument();
  });

  it('lists the six units with node counts from UNITS', () => {
    renderLanding();
    const items = within(
      screen.getByRole('list', { name: 'Unidades da trilha' }),
    ).getAllByRole('listitem');
    expect(items.map((item) => item.textContent)).toEqual(
      UNITS.map((unit) => `${unit.title}${unit.nodes.length}`),
    );
    expect(UNITS.map((unit) => unit.nodes.length)).toEqual([2, 3, 4, 3, 2, 6]);
  });

  it('shows the sample study day without a save', () => {
    renderLanding();
    const card = screen.getByLabelText('Exemplo de um dia de estudo');
    expect(within(card).getByText('32 XP')).toBeInTheDocument();
    expect(
      within(card).getByText('Meta de 50 XP. Quatro dias seguidos'),
    ).toBeInTheDocument();
  });

  it('shows the real study day when given one', () => {
    render(
      <MemoryRouter>
        <LandingPage ctaTo="/hoje" day={{ xp: 10, goal: 100, streak: 2 }} />
      </MemoryRouter>,
    );
    const card = screen.getByLabelText('Seu dia de estudo');
    expect(within(card).getByText('10 XP')).toBeInTheDocument();
    expect(
      within(card).getByText('Meta de 100 XP. Dois dias seguidos'),
    ).toBeInTheDocument();
  });
});
