import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { NODES } from '../../content';
import { newCard } from '../../lib/srs/fsrs';
import {
  SaveV1Schema,
  createEmptySave,
  type SaveV1,
} from '../../lib/storage';
import { FIXED_NOW } from '../../test/renderWithProgress';
import { SkillTree } from './SkillTree';

function saveWith(overrides: Partial<SaveV1> = {}): SaveV1 {
  return SaveV1Schema.parse({
    ...createEmptySave(FIXED_NOW),
    onboarded: true,
    ...overrides,
  });
}

function renderTree(save: SaveV1 = saveWith()) {
  return render(
    <MemoryRouter>
      <SkillTree save={save} now={FIXED_NOW} />
    </MemoryRouter>,
  );
}

describe('SkillTree', () => {
  it('shows every fresh node as Nova and never as Em dia', () => {
    renderTree();

    expect(screen.getAllByText('Nova')).toHaveLength(NODES.length);
    expect(screen.queryByText('Em dia')).not.toBeInTheDocument();
  });

  it('shows the Prova 2 unit with its six nodes', () => {
    renderTree();

    expect(
      screen.getByRole('heading', { level: 2, name: 'Prova 2' }),
    ).toBeInTheDocument();
    expect(screen.getByText('6 nós')).toBeInTheDocument();
  });

  it('shows how many cards are due only on the node that has them', () => {
    const cards = Object.fromEntries(
      ['n05-f001', 'n05-f002', 'n05-f003'].map((id) => [
        id,
        newCard(FIXED_NOW),
      ]),
    );

    renderTree(saveWith({ cards }));

    const due = screen.getByText('3 cartas para revisar');
    expect(due.closest('a')).toHaveAttribute('href', '/no/n05');
    expect(screen.getAllByText(/cartas? para revisar/)).toHaveLength(1);
  });

  it('shows the quiz, cartas and código labels under the stars', () => {
    renderTree();

    for (const label of ['quiz', 'cartas', 'código']) {
      expect(screen.getAllByText(label)).toHaveLength(NODES.length);
    }
  });
});
