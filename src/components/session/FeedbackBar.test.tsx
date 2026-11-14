import { readFileSync } from 'node:fs';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FeedbackBar } from './FeedbackBar';

const css = readFileSync('src/components/session/FeedbackBar.css', 'utf8');

describe('FeedbackBar', () => {
  it('is a polite status region', () => {
    render(
      <FeedbackBar verdict="correct" onContinue={() => {}}>
        Explicação
      </FeedbackBar>,
    );

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent('Explicação');
  });

  it('carries text and an icon for each verdict, not color alone', () => {
    const { container, rerender } = render(
      <FeedbackBar verdict="correct" onContinue={() => {}} />,
    );
    // v4: titles are "Correto." and "Quase." (was "Correto!"/"Incorreto").
    expect(screen.getByText('Correto.')).toBeInTheDocument();
    expect(container.querySelector('svg')).not.toBeNull();

    rerender(<FeedbackBar verdict="wrong" onContinue={() => {}} />);
    expect(screen.getByText('Quase.')).toBeInTheDocument();
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('Continuar is focusable and activates with Enter', async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    render(<FeedbackBar verdict="correct" onContinue={onContinue} />);

    await user.tab();
    expect(screen.getByRole('button', { name: 'Continuar' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('removes its animation under prefers-reduced-motion', () => {
    const block = css.match(
      /@media\s*\(\s*prefers-reduced-motion:\s*reduce\s*\)\s*\{([\s\S]*)\}\s*$/,
    );
    expect(block?.[1]).toMatch(/\.feedback-bar[^{]*\{[^}]*animation:\s*none/);
  });
});
