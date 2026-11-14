import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('renders the landing heading', async () => {
    render(<App />);

    // v4: landing h1 now ends with a period
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Aprenda interfaces web zerando a trilha.' }),
    ).toBeInTheDocument();
  });
});
