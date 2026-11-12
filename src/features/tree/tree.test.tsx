import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { getChallenges, getFlashcards } from '../../content';
import { newCard } from '../../lib/srs/fsrs';
import { SAVE_KEY, type SaveV1 } from '../../lib/storage';
import {
  FIXED_NOW,
  renderWithProgress,
  type RenderWithProgressOptions,
} from '../../test/renderWithProgress';
import { NodePage } from './NodePage';
import { TreePage } from './TreePage';

function dueCards(ids: readonly string[]): SaveV1['cards'] {
  return Object.fromEntries(ids.map((id) => [id, newCard(FIXED_NOW)]));
}

function renderNode(
  route: string,
  options: Omit<RenderWithProgressOptions, 'route'> = {},
) {
  return renderWithProgress(
    <Routes>
      <Route path="/no/:nodeId" element={<NodePage />} />
    </Routes>,
    { ...options, route },
  );
}

function trilha() {
  return within(screen.getByRole('region', { name: 'Trilha' }));
}

describe('árvore de habilidades', () => {
  it('renders five unit sections and fourteen enabled node links', () => {
    renderWithProgress(<TreePage />);

    const tree = trilha();
    expect(tree.getAllByRole('heading', { level: 2 })).toHaveLength(5);

    const links = tree.getAllByRole('link');
    expect(links).toHaveLength(14);
    for (const link of links) {
      expect(link).toHaveAttribute('href', expect.stringMatching(/^\/no\/n\d{2}$/));
      expect(link).not.toHaveAttribute('aria-disabled', 'true');
    }
  });

  it('mostra o herói Continuar', () => {
    renderWithProgress(<TreePage />);

    const hero = within(screen.getByRole('region', { name: 'Continuar' }));
    expect(
      hero.getByText('Introdução à Web e tecnologias'),
    ).toBeInTheDocument();
    expect(hero.getByRole('link', { name: 'Continuar' })).toHaveAttribute(
      'href',
      '/no/n01',
    );
    expect(
      hero.getByRole('progressbar', { name: 'Meta diária' }),
    ).toBeInTheDocument();
    expect(hero.queryByRole('link', { name: /^Revisar/ })).not.toBeInTheDocument();
  });

  it('oferece revisar as cartas devidas pelo herói', () => {
    const cards = dueCards(
      Array.from({ length: 10 }, (_, index) =>
        `n09-f${String(index + 1).padStart(3, '0')}`,
      ),
    );

    renderWithProgress(<TreePage />, { save: { cards } });

    const hero = within(screen.getByRole('region', { name: 'Continuar' }));
    expect(
      hero.getByRole('link', { name: 'Revisar 10 cartas' }),
    ).toHaveAttribute('href', '/revisao');
  });

  it('mantém o título da página só para leitores de tela', () => {
    renderWithProgress(<TreePage />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'DIW Arcade' }),
    ).toHaveClass('sr-only');
  });

  it('tags exactly n01 as recommended on a fresh save', () => {
    renderWithProgress(<TreePage />);

    const tags = trilha().getAllByText('Recomendado');
    expect(tags).toHaveLength(1);
    expect(tags[0]!.closest('a')).toHaveAttribute('href', '/no/n01');
  });

  it('recommends the node with the most due cards', () => {
    const cards = {
      ...dueCards(['n05-f001', 'n05-f002', 'n05-f003']),
      ...dueCards([
        'n09-f001',
        'n09-f002',
        'n09-f003',
        'n09-f004',
        'n09-f005',
        'n09-f006',
        'n09-f007',
      ]),
    };

    renderWithProgress(<TreePage />, { save: { cards } });

    const tags = trilha().getAllByText('Recomendado');
    expect(tags).toHaveLength(1);
    expect(tags[0]!.closest('a')).toHaveAttribute('href', '/no/n09');
  });

  it('shows the star rating label on every node card', () => {
    renderWithProgress(<TreePage />);

    const labels = screen.getAllByRole('img', { name: /^Domínio: / });
    expect(labels).toHaveLength(14);
    expect(labels[0]).toHaveAccessibleName(
      'Domínio: quiz pendente, cartas pendente, código pendente',
    );
  });

  it('draws the decorative connectors out of the accessibility tree', () => {
    renderWithProgress(<TreePage />);

    const connectors = document.querySelectorAll('svg[aria-hidden="true"]');
    expect(connectors.length).toBeGreaterThanOrEqual(5);
  });
});

describe('página do nó', () => {
  it('shows the node title as the h1, with aulas, state, stars and the three modes', () => {
    renderNode('/no/n07');

    expect(
      screen.getByRole('heading', { level: 1, name: 'Propriedades CSS' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Aulas:.*172/)).toBeInTheDocument();
    expect(screen.getByText('Nova')).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: /^Domínio: / }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('link', { name: 'Começar quiz' }),
    ).toHaveAttribute('href', '/no/n07/quiz');
    expect(
      screen.getByRole('link', { name: 'Revisar cartas' }),
    ).toHaveAttribute('href', '/no/n07/cartas');
    expect(
      screen.getByRole('heading', { name: 'Código' }),
    ).toBeInTheDocument();
  });

  it('lists the node challenges as pending status rows', () => {
    renderNode('/no/n07');

    expect(screen.getAllByText('pendente')).toHaveLength(
      getChallenges('n07').length,
    );
  });

  it('introduces the whole deck and reports how many cards were added', async () => {
    const user = userEvent.setup();
    const { storage } = renderNode('/no/n01');
    const deckSize = getFlashcards('n01').length;

    const button = screen.getByRole('button', {
      name: `Adicionar baralho inteiro (${deckSize} cartas novas)`,
    });
    expect(button).toBeEnabled();
    expect(
      screen.getByText(
        'Introduz agora todas as cartas novas deste nó, além do limite diário. Elas contam no total de novas de hoje.',
      ),
    ).toBeInTheDocument();

    await user.click(button);

    expect(
      await screen.findByText(`${deckSize} cartas adicionadas`),
    ).toBeInTheDocument();

    const saved = JSON.parse(storage.getItem(SAVE_KEY) ?? '{}') as SaveV1;
    expect(Object.keys(saved.cards)).toHaveLength(deckSize);
    expect(
      screen.getByRole('button', {
        name: 'Adicionar baralho inteiro (0 cartas novas)',
      }),
    ).toBeDisabled();
  });

  it('disables the whole-deck button when every card is already introduced', () => {
    const cards = dueCards(getFlashcards('n01').map((card) => card.id));

    renderNode('/no/n01', { save: { cards } });

    expect(
      screen.getByRole('button', {
        name: 'Adicionar baralho inteiro (0 cartas novas)',
      }),
    ).toBeDisabled();
  });

  it('shows the not-found message for an unknown node', () => {
    renderNode('/no/n99');

    expect(screen.getByText('Nó não encontrado')).toBeInTheDocument();
  });
});
