import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Domina } from './Domina';

describe('Domina', () => {
  it('lists each term with its state as text', () => {
    render(
      <Domina
        items={[
          { id: 'a', front: 'Seletor', state: 'nova' },
          { id: 'b', front: 'Cascata', state: 'aprendendo' },
          { id: 'c', front: 'Herança', state: 'dominada' },
        ]}
      />,
    );
    expect(screen.getByRole('heading', { name: 'O que você já domina' })).toBeInTheDocument();
    const rows = screen.getAllByRole('listitem');
    expect(rows).toHaveLength(3);
    expect(within(rows[0]!).getByText('Seletor')).toBeInTheDocument();
    // v4: the prototype shows two states, "Falta praticar" and "Dominado", not the three SRS words.
    expect(within(rows[0]!).getByText('Falta praticar')).toBeInTheDocument();
    expect(within(rows[1]!).getByText('Falta praticar')).toBeInTheDocument();
    expect(within(rows[2]!).getByText('Dominado')).toBeInTheDocument();
  });

  it('renders the card front as code', () => {
    render(<Domina items={[{ id: 'a', front: 'display: flex', state: 'dominada' }]} />);
    expect(screen.getByText('display: flex').tagName).toBe('CODE');
  });

  it('shows a short note and no list when there are no cards', () => {
    render(<Domina items={[]} />);
    expect(screen.queryByRole('list')).toBeNull();
    expect(screen.getByText('Sem termos neste nó ainda.')).toBeInTheDocument();
  });
});
