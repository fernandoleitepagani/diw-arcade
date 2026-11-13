import { readFileSync } from 'node:fs';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { Button, ButtonLink } from './Button';

const css = readFileSync('src/components/pixel/Button/Button.css', 'utf8');

describe('Button', () => {
  it('activates with Enter and Space', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={onClick}>Jogar</Button>);

    await user.tab();
    expect(screen.getByRole('button', { name: 'Jogar' })).toHaveFocus();

    await user.keyboard('{Enter}');
    await user.keyboard(' ');
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('ButtonLink renders a link with the label', () => {
    render(
      <MemoryRouter>
        <ButtonLink to="/jogar">Jogar</ButtonLink>
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: 'Jogar' });
    expect(link).toHaveAttribute('href', '/jogar');
  });

  it('CSS draws the focus ring inside the notch', () => {
    const focusRules = [
      ...css.matchAll(/([^{}]*:focus-visible[^{}]*)\{([^}]*)\}/g),
    ];
    const insideNotch = focusRules.some(
      ([, selector, body]) =>
        selector?.includes('.btn') === true &&
        /outline-offset\s*:\s*-\d/.test(body ?? ''),
    );

    expect(insideNotch).toBe(true);
  });

  it('disables the press transform under prefers-reduced-motion', () => {
    const reducedMotion = css.match(
      /@media\s*\(\s*prefers-reduced-motion:\s*reduce\s*\)\s*\{([\s\S]*)\}\s*$/,
    );

    expect(reducedMotion?.[1]).toMatch(
      /\.btn:active\s*\{[^}]*transform:\s*none/,
    );
  });
});
