import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { getChallenges, getFlashcards, NODES, type NodeId } from '../../content';
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
  it('shows every fresh node as Nova, as text, and never as Em dia', () => {
    renderTree();

    expect(screen.getAllByText('Nova')).toHaveLength(NODES.length);
    expect(screen.queryByText('Em dia')).not.toBeInTheDocument();
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

  it('shows the Prova 2 unit heading', () => {
    renderTree();

    expect(
      screen.getByRole('heading', { level: 2, name: /Prova 2/ }),
    ).toBeInTheDocument();
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

  it('tags the recommended node', () => {
    renderTree();

    const tag = screen.getByText('Recomendado');
    expect(tag.closest('a')).toHaveAttribute('href', '/no/n01');
  });

  it('puts the lab guides at the end of their unit under Projetos', () => {
    renderTree();

    const hrefs = screen
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'))
      .filter((href) => href?.startsWith('/laboratorios/'));
    expect(hrefs).toEqual([
      '/laboratorios/lab-01',
      '/laboratorios/lab-02',
      '/laboratorios/lab-03',
      '/laboratorios/jsonserver',
    ]);
    expect(screen.getAllByRole('heading', { level: 3, name: 'Projetos' })).toHaveLength(2);
  });

  it('collapses a finished unit into one button that toggles with the keyboard', async () => {
    const user = userEvent.setup();
    renderTree(mastered(['n01', 'n02']));

    const button = screen.getByRole('button', {
      name: /Fundamentos da Web.*2 de 2 nós, concluída/,
    });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('link', { name: /Introdução à Web/ })).not.toBeInTheDocument();

    button.focus();
    await user.keyboard('{Enter}');
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: /Introdução à Web/ })).toBeInTheDocument();
    expect(within(button.closest('section')!).getAllByText('Dominada')).toHaveLength(2);

    await user.keyboard(' ');
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('keeps unfinished units open without a toggle button', () => {
    renderTree(mastered(['n01', 'n02']));

    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.getByRole('link', { name: /Sintaxe e elementos HTML/ })).toBeInTheDocument();
  });
});
