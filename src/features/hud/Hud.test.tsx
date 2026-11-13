import { screen, within } from '@testing-library/react';
import { Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { Layout } from '../../app/Layout';
import { addDays, toDayKey } from '../../lib/game/days';
import type { SaveV1 } from '../../lib/storage';
import { FIXED_NOW, renderWithProgress } from '../../test/renderWithProgress';
import { Hud } from './Hud';

const TODAY = toDayKey(FIXED_NOW);

function activeDay(xp: number): SaveV1['days'][string] {
  return { xp, quiz: 0, cards: 0, challenges: 0, labs: 0 };
}

/** A three-day streak ending today, with the given XP earned today. */
function saveWithStreak(xpTotal: number, todayXp: number): Partial<SaveV1> {
  return {
    xpTotal,
    days: {
      [addDays(TODAY, -2)]: activeDay(10),
      [addDays(TODAY, -1)]: activeDay(10),
      [TODAY]: activeDay(todayXp),
    },
  };
}

describe('Hud', () => {
  it('shows the level, XP progress, streak and daily goal', () => {
    renderWithProgress(<Hud />, { save: saveWithStreak(120, 20) });

    expect(screen.getByText('Nv 2')).toBeInTheDocument();

    const bar = screen.getByRole('progressbar', {
      name: 'XP para o próximo nível',
    });
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '150');
    expect(bar).toHaveAttribute('aria-valuenow', '20');

    expect(screen.getByText('3 dias')).toBeInTheDocument();
    expect(screen.getByText('20/50 XP hoje')).toBeInTheDocument();
  });

  it('marks the daily goal as met once the target is reached', () => {
    renderWithProgress(<Hud />, { save: saveWithStreak(120, 60) });

    const goal = screen.getByText('60/50 XP hoje').closest('.hud__today');
    expect(goal).toHaveAttribute('data-met', 'true');
    expect(goal).toHaveClass('hud__today--met');
  });

  it('keeps the goal unmarked below the target', () => {
    renderWithProgress(<Hud />, { save: saveWithStreak(120, 20) });

    const goal = screen.getByText('20/50 XP hoje').closest('.hud__today');
    expect(goal).toHaveAttribute('data-met', 'false');
    expect(goal).not.toHaveClass('hud__today--met');
  });
});

function renderLayout() {
  return renderWithProgress(
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<p>Conteúdo</p>} />
      </Route>
    </Routes>,
    { save: saveWithStreak(120, 20) },
  );
}

describe('Layout effects', () => {
  it('mounts the decorative aurora and wraps the content in ClickSpark', () => {
    const { container } = renderLayout();

    const aurora = container.querySelector('.aurora');
    expect(aurora).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelector('.click-spark')).not.toBeNull();
    expect(screen.getByText('Conteúdo')).toBeInTheDocument();
  });

  it('renders a single main navigation with five icon links', () => {
    renderLayout();

    const navigation = screen.getByRole('navigation', {
      name: 'Navegação principal',
    });
    expect(
      screen.getAllByRole('navigation', { name: 'Navegação principal' }),
    ).toHaveLength(1);

    const links = within(navigation).getAllByRole('link');
    expect(links).toHaveLength(5);
    for (const link of links) {
      expect(link.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
    }
  });

  it('keeps the brand out of the headings', () => {
    renderLayout();

    const brand = screen.getByRole('link', { name: 'DIW Arcade' });
    expect(brand.closest('h1, h2, h3, h4, h5, h6')).toBeNull();
    expect(
      screen.queryByRole('heading', { name: 'DIW Arcade' }),
    ).not.toBeInTheDocument();
  });
});
