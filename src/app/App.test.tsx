import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('renders the DIW Arcade heading', async () => {
    render(<App />);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'DIW Arcade' }),
    ).toBeInTheDocument();
  });
});
