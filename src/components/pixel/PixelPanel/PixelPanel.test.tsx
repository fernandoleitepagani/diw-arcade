import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PixelPanel } from './PixelPanel';

describe('PixelPanel', () => {
  it('renders as the requested element', () => {
    render(
      <PixelPanel as="section" aria-label="Resumo">
        Conteúdo do painel
      </PixelPanel>,
    );

    const panel = screen.getByRole('region', { name: 'Resumo' });
    expect(panel.tagName).toBe('SECTION');
    expect(panel).toHaveClass('px');
    expect(panel).toHaveTextContent('Conteúdo do painel');
  });
});
