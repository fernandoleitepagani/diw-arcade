import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
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
  it('shows the level, XP progress, streak and daily goal on one line', () => {
    renderWithProgress(<Hud />, { save: saveWithStreak(120, 20) });

    expect(screen.getByText('Nv 2')).toBeInTheDocument();

    expect(screen.getByText('20/150 XP')).toBeInTheDocument();

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
