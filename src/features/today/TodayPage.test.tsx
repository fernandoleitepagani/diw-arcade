import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { newCard } from '../../lib/srs/fsrs';
import { createEmptySave } from '../../lib/storage';
import { FIXED_NOW, renderWithProgress } from '../../test/renderWithProgress';
import { TodayPage } from './TodayPage';

describe('TodayPage', () => {
  it('shows the h1, one primary next step and a goal sentence', () => {
    renderWithProgress(<TodayPage />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Hoje' }),
    ).toBeInTheDocument();
    const primary = screen.getByRole('link', { name: /Praticar com o quiz/ });
    expect(primary).toHaveAttribute('href', '/no/n01?passo=praticar');
    expect(screen.getByTestId('today-goal').textContent).toMatch(/\.$/);
  });

  it('lists two or three alternates in their own region', () => {
    renderWithProgress(<TodayPage />);

    const region = screen.getByRole('region', { name: 'Outras opções' });
    const links = within(region).getAllByRole('link');
    expect(links.length).toBeGreaterThanOrEqual(2);
    expect(links.length).toBeLessThanOrEqual(3);
  });

  it('labels the unit with a Tag', () => {
    renderWithProgress(<TodayPage />);

    expect(screen.getByText('Fundamentos da Web')).toBeInTheDocument();
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
  });
});
