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
    expect(within(rows[0]!).getByText('nova')).toBeInTheDocument();
    expect(within(rows[1]!).getByText('aprendendo')).toBeInTheDocument();
    expect(within(rows[2]!).getByText('dominada')).toBeInTheDocument();
  });

  it('shows a short note and no list when there are no cards', () => {
    render(<Domina items={[]} />);
    expect(screen.queryByRole('list')).toBeNull();
    expect(screen.getByText('Sem termos neste nó ainda.')).toBeInTheDocument();
  });
});
