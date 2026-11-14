import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { toDayKey } from '../../lib/game/days';
import { newCard } from '../../lib/srs/fsrs';
import { createEmptySave } from '../../lib/storage';
import { FIXED_NOW, renderWithProgress } from '../../test/renderWithProgress';
import { TodayPage } from './TodayPage';

describe('TodayPage', () => {
  it('shows the h1 and one Continuar link to the next step', () => {
    renderWithProgress(<TodayPage />);

    // v4: h1 is the prototype greeting, primary is "Continuar"
    expect(
      screen.getByRole('heading', { level: 1, name: 'Bom te ver de volta.' }),
    ).toBeInTheDocument();
    const primary = screen.getByRole('link', { name: /Continuar/ });
    expect(primary).toHaveAttribute('href', '/no/n01?passo=praticar');
    expect(screen.getByText(/4 passos\./)).toBeInTheDocument();
  });

  it('shows the next-step panel with a 4-segment bar and the node title', () => {
    renderWithProgress(<TodayPage />);

    expect(screen.getAllByRole('heading', { level: 2 })[0]).toBeVisible();
    expect(
      screen.getByRole('img', { name: /\d de 4 passos/ }),
    ).toBeInTheDocument();
  });

  it('shows the goal block for a seeded save', () => {
    const save = createEmptySave(FIXED_NOW);
    save.days[toDayKey(FIXED_NOW)] = {
      xp: 32,
      quiz: 0,
      cards: 0,
      challenges: 0,
      labs: 0,
    };
    renderWithProgress(<TodayPage />, { save });

    expect(screen.getByText('32 de 50 XP hoje')).toBeInTheDocument();
    expect(screen.getByText(/Faltam 18 XP\./)).toBeInTheDocument();
    expect(
      screen.getByRole('progressbar', { name: '32 de 50 XP hoje' }),
    ).toHaveAttribute('aria-valuemax', '25');
  });

  it('shows a met state when the goal is reached', () => {
    const save = createEmptySave(FIXED_NOW);
    save.days[toDayKey(FIXED_NOW)] = {
      xp: 55,
      quiz: 0,
      cards: 0,
      challenges: 0,
      labs: 0,
    };
    renderWithProgress(<TodayPage />, { save });

    expect(screen.getByText('55 de 50 XP hoje')).toBeInTheDocument();
    expect(screen.getByText(/Meta de hoje cumprida/)).toBeInTheDocument();
    expect(screen.queryByText(/Faltam/)).not.toBeInTheDocument();
  });

  it('lists the Também hoje rows only when they apply', () => {
    renderWithProgress(<TodayPage />);

    const region = screen.getByRole('region', { name: 'Também hoje' });
    expect(within(region).queryByText(/cartas? para revisar/)).toBeNull();
    expect(within(region).getByText(/^Quiz de /)).toBeInTheDocument();
    expect(
      within(region).getByRole('link', { name: /Começar/ }),
    ).toHaveAttribute('href', '/no/n01?passo=praticar');
  });

  it('labels the unit with a Tag', () => {
    renderWithProgress(<TodayPage />);

    // v4: unit renamed to match prototype
    expect(screen.getByText('Fundamentos')).toBeInTheDocument();
  });

  it('puts due cards first', () => {
    const save = createEmptySave(FIXED_NOW);
    save.cards['n01-f001'] = {
      ...newCard(FIXED_NOW),
      due: new Date(FIXED_NOW.getTime() - 60_000).toISOString(),
      reps: 1,
      state: 2,
    };
    renderWithProgress(<TodayPage />, { save });

    expect(screen.getByRole('link', { name: /Revisar/ })).toHaveAttribute(
      'href',
      '/revisao',
    );
    expect(screen.getByText(/^\d+ cartas? para revisar$/)).toBeInTheDocument();
  });
});
