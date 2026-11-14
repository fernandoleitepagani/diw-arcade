import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { getChallenges, getFlashcards, NODES, UNITS, type NodeId } from '../../content';
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

const mastered = (ids: readonly NodeId[]) => {
  const base = createEmptySave(FIXED_NOW);
  const rounds: SaveV1['quiz']['rounds'] = {};
  const cards: SaveV1['cards'] = {};
  const challenges: SaveV1['challenges'] = {};
  for (const id of ids) {
    rounds[id] = { best: 100, count: 1, perfect: true };
    for (const flashcard of getFlashcards(id)) {
      cards[flashcard.id] = {
        ...newCard(FIXED_NOW),
        due: '2099-01-01T00:00:00.000Z',
        reps: 1,
        state: 2,
      };
    }
    for (const challenge of getChallenges(id)) {
      challenges[challenge.id] = {
        passed: true,
        failedRuns: 0,
        hintsUsed: 0,
        xpAwarded: 0,
        code: null,
      };
    }
  }
  return saveWith({ quiz: { ...base.quiz, rounds }, cards, challenges });
};

describe('SkillTree', () => {
  it('names every fresh node link by its title and Não iniciado, never Em dia', () => {
    renderTree();

    // v4: the state is the end of the link name, not visible text.
    const links = screen
      .getAllByRole('link')
      .filter((link) => /^\/no\//.test(link.getAttribute('href') ?? ''));
    expect(links).toHaveLength(NODES.length);
    for (const [index, link] of links.entries()) {
      expect(link).toHaveAccessibleName(`${NODES[index]!.title}, Não iniciado`);
    }
    expect(screen.queryByText('Em dia')).not.toBeInTheDocument();
  });

  it('names a mid-progress node "<título>, Em andamento" and a done one "Concluído"', () => {
    const base = mastered(['n01', 'n02', 'n03', 'n04', 'n05', 'n06', 'n07', 'n08']);
    renderTree(
      saveWith({
        ...base,
        cards: {
          ...base.cards,
          'n09-f001': { ...newCard(FIXED_NOW), due: '2099-01-01T00:00:00.000Z' },
        },
      }),
    );

    expect(screen.getByRole('link', { name: 'Flexbox e Grid, Em andamento' })).toHaveAttribute(
      'href',
      '/no/n09',
    );
    expect(screen.getByRole('link', { name: 'Propriedades CSS, Concluído' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Bootstrap, Não iniciado' })).toBeInTheDocument();
  });

  it('numbers the nodes 01 to 20 and links each to its lesson', () => {
    renderTree();

    const links = screen
      .getAllByRole('link')
      .filter((link) => /^\/no\//.test(link.getAttribute('href') ?? ''));
    expect(links).toHaveLength(20);
    expect(links[0]).toHaveAttribute('href', '/no/n01');
    expect(links[0]).toHaveTextContent('01');
    expect(links[19]).toHaveAttribute('href', '/no/n20');
    expect(links[19]).toHaveTextContent('20');
  });

  it('shows the Prova 2 unit heading with its x de y count', () => {
    renderTree();

    expect(
      screen.getByRole('heading', { level: 2, name: /Prova 2/ }),
    ).toHaveTextContent('Prova 2');
    expect(screen.getByRole('heading', { level: 2, name: /Prova 2.*0 de 6/ })).toBeInTheDocument();
  });

  it('counts the finished nodes of each unit in its header', () => {
    renderTree(mastered(['n01', 'n02', 'n03']));

    expect(screen.getByRole('heading', { level: 2, name: /Fundamentos.*2 de 2/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /HTML.*1 de 3/ })).toBeInTheDocument();
  });

  it('marks exactly one node with "Você está aqui, k de 4 passos"', () => {
    renderTree();

    const marker = screen.getByText('Você está aqui, 0 de 4 passos');
    expect(screen.getAllByText(/Você está aqui/)).toHaveLength(1);
    expect(marker.closest('a')).toHaveAttribute('href', '/no/n01');
  });

  it('counts the finished lesson steps in the marker', () => {
    renderTree(mastered(['n01', 'n02']));

    const marker = screen.getByText(/Você está aqui/);
    expect(marker.closest('a')).toHaveAttribute('href', '/no/n03');
    expect(marker).toHaveTextContent('Você está aqui, 0 de 4 passos');
  });

  it('keeps every unit expanded, with no buttons and no Projetos block', () => {
    renderTree(mastered(['n01', 'n02']));

    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(screen.queryByText('Projetos')).not.toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(UNITS.length);
    // v4: a finished unit still lists its nodes.
    expect(screen.getByRole('link', { name: /Introdução à Web/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Sintaxe e elementos HTML/ })).toBeInTheDocument();
  });

  it('gives each node a disc inside the link, hidden from assistive tech', () => {
    renderTree();

    const link = screen.getByRole('link', { name: /Introdução à Web/ });
    expect(within(link).getByText('01').closest('.skill-node__lbl')).not.toBeNull();
    expect(link.querySelector('.node-disc svg[aria-hidden="true"]')).not.toBeNull();
  });
});
