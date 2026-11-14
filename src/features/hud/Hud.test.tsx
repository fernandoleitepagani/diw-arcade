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
  it('shows the level, a 10-segment XP bar, the streak and the daily goal', () => {
    renderWithProgress(<Hud />, { save: saveWithStreak(120, 20) });

    // v4: "nível N" replaces "Nv N"; the XP text became a 10-segment bar
    expect(screen.getByText('nível 2')).toBeInTheDocument();

    const bar = screen.getByRole('progressbar');
    expect(bar.querySelectorAll('i')).toHaveLength(10);
    expect(bar).toHaveAttribute('aria-valuenow', '1');
    expect(bar).toHaveAttribute('aria-valuemax', '10');

    // v4: the streak is a flame chip labelled "Sequência de N dias"
    expect(screen.getByLabelText('Sequência de 3 dias')).toHaveTextContent('3');
    // v4: the goal chip shows "x/50" next to a coin
    expect(screen.getByText('20/50')).toBeInTheDocument();
  });

  it('uses the singular for a one-day streak', () => {
    renderWithProgress(<Hud />, {
      save: { days: { [TODAY]: activeDay(10) } },
    });

    expect(screen.getByLabelText('Sequência de 1 dia')).toBeInTheDocument();
  });

  it('marks the daily goal as met once the target is reached', () => {
    renderWithProgress(<Hud />, { save: saveWithStreak(120, 60) });

    const goal = screen.getByText('60/50').closest('.hud__today');
    expect(goal).toHaveAttribute('data-met', 'true');
    expect(goal).toHaveClass('hud__today--met');
  });

  it('keeps the goal unmarked below the target', () => {
    renderWithProgress(<Hud />, { save: saveWithStreak(120, 20) });

    const goal = screen.getByText('20/50').closest('.hud__today');
    expect(goal).toHaveAttribute('data-met', 'false');
    expect(goal).not.toHaveClass('hud__today--met');
  });
});
