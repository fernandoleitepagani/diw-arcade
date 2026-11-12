import { Component, type ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RequireOnboarding } from './RequireOnboarding';

class ErrorBoundary extends Component<
  { children: ReactNode },
  { message: string | null }
> {
  state = { message: null };

  static getDerivedStateFromError(error: Error) {
    return { message: error.message };
  }

  render() {
    if (this.state.message !== null) {
      return <p role="alert">{this.state.message}</p>;
    }
    return this.props.children;
  }
}

describe('RequireOnboarding', () => {
  it('fails loudly when mounted without a ProgressProvider', () => {
    render(
      <ErrorBoundary>
        <RequireOnboarding />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(/ProgressProvider/);
  });
});
