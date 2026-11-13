import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Primer } from '../../content';
import { firstUnfinishedStep, getLessonSteps } from '../../lib/progress/lessonSteps';
import { createEmptySave } from '../../lib/storage';
import { LerPanel } from './StepPanels';
import { PrimerView } from './PrimerView';

const SOURCES = [
  { aula: 174, slide: 3 },
  { kind: 'tiaw', doc: 'tiaw-json', slide: 2 },
  { kind: 'repo', path: 'PROJETOS/a/b.js', startLine: 1, endLine: 9 },
  { kind: 'orientacao' },
] as const;

function fixture(count = 6): Primer {
  return {
    nodeId: 'n01',
    points: Array.from({ length: count }, (_, i) => ({
      title: `Ponto ${i + 1}`,
      body: i === 0 ? 'Use `div` com cuidado.' : `Corpo ${i + 1}`,
      ...(i === 0
        ? { code: { lang: 'html' as const, text: '<div>oi</div>' } }
        : {}),
      source: SOURCES[i % 4]!,
      evidence: 'x',
    })),
  } as unknown as Primer;
}

describe('PrimerView', () => {
  it('renders every point with a source line, code display-only', () => {
    render(<PrimerView primer={fixture(8)} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(8);
    expect(screen.getAllByText('Fonte: aula 174, slide 3').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^Fonte: TIAW/)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/^Fonte: repositório/)[0]).toBeInTheDocument();
    expect(screen.getAllByText('Fonte: orientações da Prova 2').length).toBeGreaterThan(0);
    const code = screen.getByText('<div>oi</div>');
    expect(code.closest('pre')).not.toBeNull();
    expect(document.body.textContent).not.toContain('·');
    const first = screen.getAllByRole('listitem')[0]!;
    expect(within(first).getByText('div').tagName).toBe('CODE');
  });
});

describe('LerPanel', () => {
  it('dispatches once, even on a second click', async () => {
    const onRead = vi.fn();
    render(<LerPanel primer={fixture()} read={false} onRead={onRead} />);
    const button = screen.getByRole('button', { name: 'Concluir leitura' });
    await userEvent.click(button);
    await userEvent.click(button);
    expect(onRead).toHaveBeenCalledTimes(1);
  });

  it('activates with Enter and Space', async () => {
    const onRead = vi.fn();
    const { unmount } = render(
      <LerPanel primer={fixture()} read={false} onRead={onRead} />,
    );
    screen.getByRole('button', { name: 'Concluir leitura' }).focus();
    await userEvent.keyboard('{Enter}');
    expect(onRead).toHaveBeenCalledTimes(1);
    unmount();
    const again = vi.fn();
    render(<LerPanel primer={fixture()} read={false} onRead={again} />);
    screen.getByRole('button', { name: 'Concluir leitura' }).focus();
    await userEvent.keyboard(' ');
    expect(again).toHaveBeenCalledTimes(1);
  });

  it('does not dispatch again when already read', async () => {
    const onRead = vi.fn();
    render(<LerPanel primer={fixture()} read onRead={onRead} />);
    expect(screen.getByText('Leitura concluída')).toBeInTheDocument();
    const button = screen.queryByRole('button', { name: 'Concluir leitura' });
    if (button) await userEvent.click(button);
    expect(onRead).not.toHaveBeenCalled();
  });

  it('shows the fallback without a primer', () => {
    render(<LerPanel primer={undefined} read={false} onRead={vi.fn()} />);
    expect(screen.getByText('Resumo ainda não disponível')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Concluir leitura' })).toBeNull();
  });
});

describe('lesson flow with a primer', () => {
  const content = {
    questions: { n01: [{ id: 'n01-q001' }] },
    flashcards: { n01: [{ id: 'n01-f001' }] },
    challenges: {},
  };
  it('Continuar moves past Ler once read, and a missing primer never blocks', () => {
    const save = createEmptySave(new Date(0));
    const pending = getLessonSteps(save, 'n01', content, {
      hasPrimer: true,
      primersRead: new Set(),
    });
    expect(firstUnfinishedStep(pending)).toBe('ler');
    const done = getLessonSteps(save, 'n01', content, {
      hasPrimer: true,
      primersRead: new Set(['n01']),
    });
    expect(done.ler).toBe('feito');
    expect(firstUnfinishedStep(done)).toBe('praticar');
    const none = getLessonSteps(save, 'n01', content, {
      hasPrimer: false,
      primersRead: new Set(),
    });
    expect(none.ler).toBe('indisponivel');
    expect(firstUnfinishedStep(none)).toBe('praticar');
  });
});
