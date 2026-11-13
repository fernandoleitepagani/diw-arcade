import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderWithProgress } from '../test/renderWithProgress';
import { AvatarMenu } from './AvatarMenu';

function setup() {
  const user = userEvent.setup();
  renderWithProgress(<AvatarMenu />);
  const trigger = screen.getByRole('button', { name: 'Menu da conta' });
  return { user, trigger };
}

describe('AvatarMenu', () => {
  it('starts closed with a collapsed trigger', () => {
    const { trigger } = setup();

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('opens with Enter and focuses the Ajustes link', async () => {
    const { user, trigger } = setup();

    trigger.focus();
    await user.keyboard('{Enter}');

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const item = screen.getByRole('menuitem', { name: 'Ajustes' });
    expect(item).toHaveAttribute('href', '/ajustes');
    expect(document.activeElement).toBe(item);
  });

  it('opens with Space', async () => {
    const { user, trigger } = setup();

    trigger.focus();
    await user.keyboard(' ');

    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('closes with Escape and returns focus to the trigger', async () => {
    const { user, trigger } = setup();

    trigger.focus();
    await user.keyboard('{Enter}');
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(document.activeElement).toBe(trigger);
  });

  it('opens with ArrowDown on the trigger', async () => {
    const { user, trigger } = setup();

    trigger.focus();
    await user.keyboard('{ArrowDown}');

    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(document.activeElement).toBe(
      screen.getByRole('menuitem', { name: 'Ajustes' }),
    );
  });

  it('keeps focus inside the menu with arrow keys', async () => {
    const { user, trigger } = setup();

    trigger.focus();
    await user.keyboard('{Enter}');
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(
      screen.getByRole('menuitem', { name: 'Ajustes' }),
    );
    await user.keyboard('{ArrowUp}');
    expect(document.activeElement).toBe(
      screen.getByRole('menuitem', { name: 'Ajustes' }),
    );
  });

  it('closes after choosing Ajustes', async () => {
    const { user, trigger } = setup();

    await user.click(trigger);
    await user.click(screen.getByRole('menuitem', { name: 'Ajustes' }));

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
