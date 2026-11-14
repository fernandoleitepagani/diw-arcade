import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { getChallenges, getFlashcards, NODES, UNITS } from '../../content';
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

function midSave(): Partial<SaveV1> {
  const rounds: SaveV1['quiz']['rounds'] = {};
  const cards: SaveV1['cards'] = {};
  const challenges: SaveV1['challenges'] = {};
  for (const node of NODES.slice(0, 8)) {
    rounds[node.id] = { best: 100, count: 1, perfect: true };
    for (const card of getFlashcards(node.id)) {
      cards[card.id] = { ...newCard(FIXED_NOW), due: '2099-01-01T00:00:00.000Z', reps: 1, state: 2 };
    }
    for (const challenge of getChallenges(node.id)) {
      challenges[challenge.id] = { passed: true, failedRuns: 0, hintsUsed: 0, xpAwarded: 0, code: null };
    }
  }
  return { quiz: { answers: {}, rounds }, cards, challenges };
}

function trilha() {
  return within(screen.getByRole('region', { name: 'Trilha' }));
}

describe('árvore de habilidades', () => {
  it('renders one unit section and one enabled node link per node', () => {
    renderWithProgress(<TreePage />);

    const tree = trilha();
    expect(tree.getAllByRole('heading', { level: 2 })).toHaveLength(
      UNITS.length,
    );

    const links = tree
      .getAllByRole('link')
      .filter((link) => link.getAttribute('href')?.startsWith('/no/'));
    expect(links).toHaveLength(NODES.length);
    for (const link of links) {
      expect(link).toHaveAttribute('href', expect.stringMatching(/^\/no\/n\d{2}$/));
      expect(link).not.toHaveAttribute('aria-disabled', 'true');
    }
  });

  it('não repete o herói Continuar acima da trilha (Hoje cuida do próximo passo)', () => {
    renderWithProgress(<TreePage />);

    expect(screen.queryByRole('region', { name: 'Continuar' })).toBeNull();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(document.getElementById('unit-u1')).not.toBeNull();
  });

  // v4: the h1 is a visible "Trilha" with a summary line and a Continuar CTA.
  it('mostra o h1 Trilha visível, o resumo e o CTA Continuar', () => {
    renderWithProgress(<TreePage />, { save: { ...midSave() } });

    const h1 = screen.getByRole('heading', { level: 1, name: 'Trilha' });
    expect(h1).not.toHaveClass('sr-only');
    expect(
      screen.getByText('8 de 20 nós concluídos. Você está em Flexbox e Grid.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Continuar Flexbox e Grid' }),
    ).toHaveAttribute('href', '/no/n09');
  });

  it('numa trilha nova o resumo diz 0 de 20 e o CTA leva ao n01', () => {
    renderWithProgress(<TreePage />);

    expect(screen.getByText(/^0 de 20 nós concluídos\./)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /^Continuar / }),
    ).toHaveAttribute('href', '/no/n01');
  });

  it('não tem aside Unidades, bloco Projetos nem botões', () => {
    renderWithProgress(<TreePage />);

    expect(screen.queryByText('Unidades')).toBeNull();
    expect(screen.queryByText('Projetos')).toBeNull();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  // v4: the "Recomendado" tag became the "Você está aqui" marker.
  it('marks exactly n01 as the current node on a fresh save', () => {
    renderWithProgress(<TreePage />);

    const tags = trilha().getAllByText(/Você está aqui/);
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

    // v4: the "Recomendado" tag became the "Você está aqui" marker.
    const tags = trilha().getAllByText(/Você está aqui/);
    expect(tags).toHaveLength(1);
    expect(tags[0]!.closest('a')).toHaveAttribute('href', '/no/n09');
  });

  it('names every node card with its state', () => {
    renderWithProgress(<TreePage />);

    // v4: the state is part of the link name ("<título>, Não iniciado").
    const named = trilha()
      .getAllByRole('link')
      .filter((link) => /, Não iniciado$/.test(link.getAttribute('aria-label') ?? ''));
    expect(named).toHaveLength(NODES.length);
  });

  it('draws the decorative connectors out of the accessibility tree', () => {
    renderWithProgress(<TreePage />);

    const connectors = document.querySelectorAll('svg[aria-hidden="true"]');
    expect(connectors.length).toBeGreaterThanOrEqual(5);
  });
});

describe('página do nó', () => {
  it('shows the meta tag "CSS, aula 174" and "1 de 3 pontos de domínio" for n09', () => {
    renderNode('/no/n09', {
      save: { quiz: { answers: {}, rounds: { n09: { best: 100, count: 1, perfect: true } } } },
    });
    expect(screen.getByText('CSS, aula 174')).toBeInTheDocument();
    expect(screen.getByText('1 de 3 pontos de domínio')).toBeInTheDocument();
    expect(
      screen.getByRole('progressbar', { name: '1 de 3 pontos de domínio' }),
    ).toBeInTheDocument();
  });

  it('shows the node title as the h1, with aulas and mastery text', () => {
    renderNode('/no/n07');

    expect(
      screen.getByRole('heading', { level: 1, name: 'Propriedades CSS' }),
    ).toBeInTheDocument();
    // v4: header meta is "<Unidade>, aula N" and the state word moved out of the header.
    expect(screen.getByText('CSS, aula 172')).toBeInTheDocument();
    expect(
      screen.getByRole('progressbar', { name: '0 de 3 pontos de domínio' }),
    ).toBeInTheDocument();
    // v4: the arrow is now a decorative pixel icon, so the link name is "Trilha".
    expect(screen.getByRole('link', { name: 'Trilha' })).toHaveAttribute(
      'href',
      '/trilha',
    );
  });

  it('points Continuar at the first unfinished step and selects its panel', () => {
    renderNode('/no/n07');

    expect(screen.getByRole('link', { name: 'Continuar' })).toHaveAttribute(
      'href',
      '/no/n07?passo=praticar',
    );
    expect(
      document.querySelector('[aria-current="step"]'),
    ).toHaveTextContent('Praticar');
    expect(screen.getByRole('link', { name: 'Começar quiz' })).toHaveAttribute(
      'href',
      '/no/n07/quiz',
    );
  });

  it('?passo selects the panel and unknown values fall back', () => {
    const { unmount } = renderNode('/no/n07?passo=fixar');
    expect(screen.getByRole('link', { name: 'Revisar cartas' })).toHaveAttribute(
      'href',
      '/no/n07/cartas',
    );
    unmount();

    const second = renderNode('/no/n07?passo=ler');
    expect(screen.getByText('Resumo ainda não disponível')).toBeInTheDocument();
    second.unmount();

    renderNode('/no/n07?passo=xyz');
    expect(
      document.querySelector('[aria-current="step"]'),
    ).toHaveTextContent('Praticar');
  });

  it('lists the node challenges as pending rows in Construir', () => {
    renderNode('/no/n07?passo=construir');

    const links = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('href')?.startsWith('/desafio/'));
    expect(links).toHaveLength(getChallenges('n07').length);
    expect(screen.getAllByText('pendente').length).toBeGreaterThanOrEqual(
      getChallenges('n07').length,
    );
  });

  it('lists the node terms with their SRS state', () => {
    renderNode('/no/n07');

    expect(
      screen.getByRole('heading', { name: 'O que você já domina' }),
    ).toBeInTheDocument();
    // v4: unmastered cards read "Falta praticar".
    expect(screen.getAllByText('Falta praticar').length).toBe(
      getFlashcards('n07').length,
    );
  });

  it('shows Nó concluído when every available step is done', () => {
    const cards = Object.fromEntries(
      getFlashcards('n07').map((card) => [
        card.id,
        { ...newCard(FIXED_NOW), reps: 3, state: 2 as const, stability: 40 },
      ]),
    );
    const challenges = Object.fromEntries(
      getChallenges('n07').map((challenge) => [
        challenge.id,
        {
          passed: true,
          failedRuns: 0,
          hintsUsed: 0 as const,
          xpAwarded: 0,
          code: null,
        },
      ]),
    );
    renderNode('/no/n07', {
      save: {
        cards,
        challenges,
        quiz: {
          answers: {},
          rounds: { n07: { best: 100, count: 1, perfect: true } },
        },
      },
    });

    expect(screen.getByText('Nó concluído')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Continuar' })).toBeNull();
  });

  it('introduces the whole deck and reports how many cards were added', async () => {
    const user = userEvent.setup();
    const { storage } = renderNode('/no/n01?passo=fixar');
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
    expect(
      screen
        .getAllByRole('status')
        .some((el) => el.textContent === `${deckSize} cartas adicionadas`),
    ).toBe(true);

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

    renderNode('/no/n01?passo=fixar', { save: { cards } });

    expect(
      screen.getByRole('button', {
        name: 'Adicionar baralho inteiro (0 cartas novas)',
      }),
    ).toBeDisabled();
  });

  it('shows the not-found message for an unknown node', () => {
    renderNode('/no/n99');

    expect(screen.getByText('Nó não encontrado')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Trilha/ }),
    ).toHaveAttribute('href', '/trilha');
  });
});
