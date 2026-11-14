import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { Row } from './Row';

describe('Row', () => {
  it('renders the action as a link with its label', () => {
    render(
      <MemoryRouter>
        <Row icon="book" action={{ label: 'Abrir lição', to: '/licao/n1' }}>
          Flexbox
        </Row>
      </MemoryRouter>,
    );
    const link = screen.getByRole('link', { name: /Abrir lição/ });
    expect(link.getAttribute('href')).toBe('/licao/n1');
    expect(screen.getByText('Flexbox')).toBeTruthy();
  });
});
