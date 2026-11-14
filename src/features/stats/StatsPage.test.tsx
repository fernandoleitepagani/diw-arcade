import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NODES } from '../../content';
import { pickLine } from '../../content/copy';
import type { ProgressContent } from '../../lib/progress';
import { renderWithProgress } from '../../test/renderWithProgress';
import { AchievementGrid } from './AchievementGrid';
import { Forecast } from './Forecast';
import { Heatmap } from './Heatmap';
import { StatsPage } from './StatsPage';

const NOW = new Date(2026, 0, 5, 12);

const CONTENT: ProgressContent = {
  questions: {
    n07: [{ id: 'n07-q001' }, { id: 'n07-q002' }],
  },
  flashcards: {
    n07: [{ id: 'n07-f001' }, { id: 'n07-f002' }],
  },
  challenges: {
    n07: [{ id: 'n07-c01' }, { id: 'n07-c02' }],
  },
};

describe('Heatmap', () => {
  it('shows the percentage text in every filled cell', () => {
    render(
      <Heatmap
        rows={[
          {
            nodeId: 'n07',
            title: 'Propriedades CSS',
            quiz: 75,
            cards: 50,
            challenges: 100,
          },
        ]}
      />,
    );

    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('names every cell by column, node and value, so color is never the only signal', () => {
    render(
      <Heatmap
        rows={[
          {
            nodeId: 'n07',
            title: 'Propriedades CSS',
            quiz: 75,
            cards: null,
            challenges: 100,
          },
        ]}
      />,
    );

    expect(
      screen.getByRole('cell', { name: 'Quiz, Propriedades CSS: 75%' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('cell', { name: 'Cartas, Propriedades CSS: sem dados' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('cell', { name: 'Código, Propriedades CSS: 100%' }),
    ).toBeInTheDocument();
  });

  it('exposes table semantics and a dash for unseen values', () => {
    render(
      <Heatmap
        rows={[
          {
            nodeId: 'n08',
            title: 'Viewport e Media Queries',
            quiz: null,
            cards: null,
            challenges: null,
          },
        ]}
      />,
    );

    const table = screen.getByRole('table', {
      name: 'Mapa de pontos fracos',
    });
    expect(table).toBeInTheDocument();
    expect(within(table).getAllByText('—')).toHaveLength(3);
    expect(within(table).getByText('Quiz')).toBeInTheDocument();
    expect(within(table).getByText('Cartas')).toBeInTheDocument();
    expect(within(table).getByText('Código')).toBeInTheDocument();
  });
});

describe('Forecast', () => {
  it('renders 14 bars, starting with hoje and amanhã', () => {
    const counts = [3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    render(<Forecast counts={counts} now={NOW} />);

    const bars = screen.getAllByRole('listitem');
    expect(bars).toHaveLength(14);
    expect(within(bars[0]!).getByText('hoje')).toBeInTheDocument();
    expect(within(bars[1]!).getByText('amanhã')).toBeInTheDocument();
    expect(within(bars[2]!).getByText('07/01')).toBeInTheDocument();
    expect(within(bars[0]!).getByText('3')).toBeInTheDocument();
  });
});

describe('AchievementGrid', () => {
  it('renders 12 locked badges on an empty unlock map', () => {
    render(<AchievementGrid unlocked={{}} />);

    expect(screen.getAllByRole('listitem')).toHaveLength(12);
    expect(screen.getAllByText('Bloqueada')).toHaveLength(12);
  });

  it('shows the unlock date for unlocked badges', () => {
    render(
      <AchievementGrid
        unlocked={{ 'primeiro-passo': '2026-01-05T12:00:00.000Z' }}
      />,
    );

    expect(screen.getByText('Primeiro passo')).toBeInTheDocument();
    expect(screen.getByText('Desbloqueada em 05/01/2026')).toBeInTheDocument();
  });
});

describe('StatsPage', () => {
  it('shows a Bit empty line for a fresh save', () => {
    renderWithProgress(<StatsPage />);

    expect(screen.getByText(pickLine('empty', 0))).toBeInTheDocument();
  });

  it('shows totals, per-node accuracy and the weak-spot heatmap', () => {
    renderWithProgress(<StatsPage content={CONTENT} />, {
      now: NOW,
      save: {
        xpTotal: 130,
        quiz: {
          answers: {
            'n07-q001': { seen: 2, correct: 1, lastCorrect: true },
            'n07-q002': { seen: 2, correct: 2, lastCorrect: true },
          },
          rounds: {},
        },
        challenges: {
          'n07-c01': {
            passed: true,
            failedRuns: 0,
            hintsUsed: 0,
            xpAwarded: 30,
            code: null,
          },
        },
      },
    });

    expect(screen.getByText('XP')).toBeInTheDocument();
    expect(screen.getByText('130')).toBeInTheDocument();
    expect(screen.getByText('Nível')).toBeInTheDocument();
    expect(screen.getByText('Sequência atual')).toBeInTheDocument();
    expect(screen.getByText('Maior sequência')).toBeInTheDocument();

    expect(
      screen.getByRole('list', { name: 'Precisão por nó' }),
    ).toBeInTheDocument();
    expect(screen.getAllByText('75%').length).toBeGreaterThan(0);
    expect(
      screen.getByRole('table', { name: 'Mapa de pontos fracos' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('listitem').length).toBeGreaterThanOrEqual(
      12 + NODES.length,
    );
  });

  it('usa PageHeader e agrupa os números', () => {
    renderWithProgress(<StatsPage content={CONTENT} />, {
      now: NOW,
      save: {
        xpTotal: 130,
        quiz: {
          answers: {
            'n07-q001': { seen: 2, correct: 1, lastCorrect: true },
            'n07-q002': { seen: 2, correct: 2, lastCorrect: true },
          },
          rounds: {},
        },
      },
    });

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Progresso' }),
    ).toBeInTheDocument();

    const totals = screen.getByText('XP').closest('dl');
    expect(totals).toHaveClass('stats__totals', 'l-grid');
    expect(totals?.querySelectorAll('dt')).toHaveLength(7);
    expect(
      Array.from(totals?.querySelectorAll('dt') ?? []).map(
        (term) => term.textContent,
      ),
    ).toEqual([
      'XP',
      'Nível',
      'Sequência atual',
      'Maior sequência',
      'Revisões',
      'Desafios concluídos',
      'Passos de laboratório',
    ]);

    const accuracy = screen.getByRole('list', { name: 'Precisão por nó' });
    for (const node of NODES) {
      const row = within(accuracy).getByText(node.title).closest('li');
      expect(row).not.toBeNull();
      expect(
        within(row as HTMLElement).getByRole('meter', { name: node.title }),
      ).toBeInTheDocument();
    }
  });
});
