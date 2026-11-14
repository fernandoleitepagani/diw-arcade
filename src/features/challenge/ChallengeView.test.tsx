import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Challenge, CodeFiles } from '../../content/schema';
import { createEmptySave, type SaveV1 } from '../../lib/storage';
import { SessionBarProvider, useSessionBarState } from '../../components/session';
import { fixtureChallenge } from '../../test/fixtures';
import type { RunResult } from '../runner/runner';
import { ChallengeView, getChallengeNextHref } from './ChallengeView';

vi.mock('./CodeEditor', () => ({
  CodeEditor: ({
    value,
    onChange,
    label,
  }: {
    value: string;
    onChange: (value: string) => void;
    label: string;
  }) => (
    <textarea
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

const emptyState = {
  passed: false,
  failedRuns: 0,
  hintsUsed: 0 as const,
  xpAwarded: 0,
  code: null,
};

const failedResult = {
  status: 'ok' as const,
  requirements: [
    { id: 'fundo-escuro', passed: false },
    { id: 'titulo-visivel', passed: false },
  ],
  errors: [],
};

const passingResult = {
  status: 'ok' as const,
  requirements: [
    { id: 'fundo-escuro', passed: true },
    { id: 'titulo-visivel', passed: true },
  ],
  errors: [],
};

function renderView(
  onRun: (files: CodeFiles) => Promise<RunResult>,
  dispatch = vi.fn(),
) {
  return render(
    <MemoryRouter>
      <ChallengeView
        challenge={fixtureChallenge}
        state={emptyState}
        onRun={onRun}
        dispatch={dispatch}
      />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ChallengeView', () => {
  it('names the node link by the node title, not its raw id', () => {
    renderView(vi.fn());
    const link = screen.getByRole('link', { name: /^Ver nó: / });
    expect(link).toHaveAttribute('href', `/no/${fixtureChallenge.nodeId}`);
    expect(link.textContent).not.toMatch(/\bn\d\d\b/);
  });

  it('fills the checklist and the live summary, then dispatches challenge/run', async () => {
    const user = userEvent.setup();
    const dispatch = vi.fn();
    const onRun = vi.fn().mockResolvedValue({
      status: 'ok',
      requirements: [
        { id: 'fundo-escuro', passed: true },
        { id: 'titulo-visivel', passed: false, message: 'O título mudou.' },
      ],
      errors: [],
    });

    renderView(onRun, dispatch);

    expect(screen.getByText(fixtureChallenge.requirements[0]?.label ?? '')).toBeInTheDocument();
    expect(screen.getByText(fixtureChallenge.requirements[1]?.label ?? '')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Executar testes' }));

    expect(await screen.findByText('1 de 2 requisitos')).toBeInTheDocument();
    expect(screen.getByText('✓')).toBeInTheDocument();
    expect(screen.getByText('✗')).toBeInTheDocument();

    await waitFor(() =>
      expect(dispatch).toHaveBeenCalledWith({
        type: 'challenge/run',
        nodeId: 'n07',
        challengeId: 'n07-c01',
        passed: false,
      }),
    );

    expect(onRun).toHaveBeenCalledWith(fixtureChallenge.starter);
  });

  it('keeps the solution locked until three failed runs', async () => {
    const user = userEvent.setup();
    const onRun = vi.fn().mockResolvedValue(failedResult);

    renderView(onRun);

    expect(screen.getByRole('button', { name: 'Ver solução' })).toBeDisabled();
    expect(screen.getByText('Disponível após 3 tentativas')).toBeInTheDocument();

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      await user.click(screen.getByRole('button', { name: 'Executar testes' }));
      await waitFor(() => expect(onRun).toHaveBeenCalledTimes(attempt));
      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Executar testes' })).toBeEnabled(),
      );
    }

    expect(screen.getByRole('button', { name: 'Ver solução' })).toBeEnabled();
  });

  it('reveals hints in order and dispatches each tier', async () => {
    const user = userEvent.setup();
    const dispatch = vi.fn();

    renderView(vi.fn(), dispatch);

    expect(screen.queryByText(fixtureChallenge.hints[0])).not.toBeInTheDocument();
    expect(screen.queryByText(/Ver dica 2/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Ver dica 1 (−5 XP)' }));

    expect(screen.getByText(fixtureChallenge.hints[0])).toBeInTheDocument();
    expect(screen.queryByText(/Ver dica 3/)).not.toBeInTheDocument();
    expect(dispatch).toHaveBeenCalledWith({
      type: 'challenge/hint',
      nodeId: 'n07',
      challengeId: 'n07-c01',
      tier: 1,
    });

    await user.click(screen.getByRole('button', { name: 'Ver dica 2 (−5 XP)' }));

    expect(screen.getByText(fixtureChallenge.hints[1])).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver dica 3 (−5 XP)' })).toBeInTheDocument();
    expect(dispatch).toHaveBeenCalledWith({
      type: 'challenge/hint',
      nodeId: 'n07',
      challengeId: 'n07-c01',
      tier: 2,
    });
  });

  it('moves between editor tabs with the arrow keys', async () => {
    const user = userEvent.setup();

    renderView(vi.fn());

    const cssTab = screen.getByRole('tab', { name: 'CSS' });
    expect(cssTab).toHaveAttribute('aria-selected', 'true');
    cssTab.focus();

    await user.keyboard('{ArrowRight}');

    const jsTab = screen.getByRole('tab', { name: 'JS' });
    expect(jsTab).toHaveAttribute('aria-selected', 'true');
    expect(jsTab).toHaveFocus();
  });

  it('shows every requirement as pending before the first run', () => {
    renderView(vi.fn());

    expect(screen.getAllByText('pendente')).toHaveLength(
      fixtureChallenge.requirements.length,
    );
  });

  it('marks the requirements as passed and opens the summary dialog', async () => {
    const user = userEvent.setup();
    const onRun = vi.fn().mockResolvedValue(passingResult);

    renderView(onRun);

    await user.click(screen.getByRole('button', { name: 'Executar testes' }));

    expect(await screen.findByText('2 de 2 requisitos')).toBeInTheDocument();
    expect(screen.getAllByText('passou')).toHaveLength(
      fixtureChallenge.requirements.length,
    );

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('link', { name: /\S/ })).toBeInTheDocument();
    expect(
      within(dialog).getByRole('button', { name: 'Continuar editando' }),
    ).toBeInTheDocument();

    await user.click(
      within(dialog).getByRole('button', { name: 'Continuar editando' }),
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('marks the requirements as failed without opening the summary', async () => {
    const user = userEvent.setup();
    const onRun = vi.fn().mockResolvedValue(failedResult);

    renderView(onRun);

    await user.click(screen.getByRole('button', { name: 'Executar testes' }));

    expect(await screen.findByText('0 de 2 requisitos')).toBeInTheDocument();
    expect(screen.getAllByText('falhou')).toHaveLength(
      fixtureChallenge.requirements.length,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('keeps the header and the workspace in the same session column', () => {
    const { container } = renderView(vi.fn());

    const article = container.querySelector('.challenge-view');
    expect(article).not.toBeNull();
    expect(article).toHaveClass('session-page');
    expect(article?.querySelector('.challenge-view__header')).not.toBeNull();
    expect(article?.querySelector('.challenge-view__grid')).not.toBeNull();
  });

  it('reports the run result in a FeedbackBar status', async () => {
    const user = userEvent.setup();
    const { container } = renderView(vi.fn().mockResolvedValue(failedResult));

    expect(container.querySelector('.feedback-bar')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Executar testes' }));

    const bar = await waitFor(() => {
      const element = container.querySelector('.feedback-bar');
      expect(element).not.toBeNull();
      return element as HTMLElement;
    });

    expect(bar).toHaveAttribute('role', 'status');
    expect(bar).toHaveClass('feedback-bar--wrong');
    expect(
      within(bar).getByText('Revise os requisitos e tente de novo.'),
    ).toBeInTheDocument();
    expect(container.querySelector('.mascot')).toBeNull();

    await user.click(within(bar).getByRole('button', { name: 'Fechar' }));
    expect(container.querySelector('.feedback-bar')).toBeNull();
  });

  it('marks a passing run as correct in the FeedbackBar', async () => {
    const user = userEvent.setup();
    const { container } = renderView(vi.fn().mockResolvedValue(passingResult));

    await user.click(screen.getByRole('button', { name: 'Executar testes' }));

    const bar = await waitFor(() => {
      const element = container.querySelector('.feedback-bar');
      expect(element).not.toBeNull();
      return element as HTMLElement;
    });
    expect(bar).toHaveClass('feedback-bar--correct');
  });

  it('orders the editor, the run button and the requirements for Tab', () => {
    renderView(vi.fn());

    const editor = screen.getByLabelText('Código CSS');
    const run = screen.getByRole('button', { name: 'Executar testes' });
    const requirements = screen.getByRole('heading', { name: 'Requisitos' });
    const follows = (a: Element, b: Element) =>
      Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

    expect(follows(editor, run)).toBe(true);
    expect(follows(run, requirements)).toBe(true);
  });

  it('keeps hint and keyboard copy free of middle dots', async () => {
    const user = userEvent.setup();
    const { container } = renderView(vi.fn());

    await user.click(screen.getByRole('button', { name: /Ver dica 1/ }));
    expect(container.textContent).not.toContain('·');
  });

  it('wraps the preview iframe in device chrome', async () => {
    const { container } = renderView(vi.fn());

    const device = container.querySelector('.challenge-view__device');
    expect(device).not.toBeNull();
    expect(
      within(device as HTMLElement).getByLabelText('Prévia do desafio'),
    ).toBeInTheDocument();

    const iframe = await waitFor(() => {
      const element = device?.querySelector('iframe');
      expect(element).not.toBeNull();
      return element as HTMLIFrameElement;
    });

    expect(device).toContainElement(iframe);
  });

  it('restores the starter code', async () => {
    const user = userEvent.setup();
    const dispatch = vi.fn();

    renderView(vi.fn(), dispatch);

    const editor = screen.getByLabelText('Código CSS');
    fireEvent.change(editor, {
      target: { value: '.cartao { background-color: hotpink; }' },
    });
    expect(editor).toHaveValue('.cartao { background-color: hotpink; }');

    await user.click(screen.getByRole('button', { name: 'Restaurar código inicial' }));

    expect(screen.getByLabelText('Código CSS')).toHaveValue(
      fixtureChallenge.starter.css,
    );
  });
});

const passOutcome = {
  xpGained: 30,
  levelUp: null,
  achievements: [],
  streakExtended: null,
};

function saveWithPassedChallenges(passedIds: string[]): SaveV1 {
  const save = createEmptySave(new Date('2026-01-01T00:00:00Z'));
  for (const challengeId of passedIds) {
    save.challenges[challengeId] = {
      passed: true,
      failedRuns: 0,
      hintsUsed: 0,
      xpAwarded: 30,
      code: null,
    };
  }
  return save;
}

function renderChallengeWithSave(
  challenge: Challenge,
  save: SaveV1,
  onRun: (files: CodeFiles) => Promise<RunResult>,
  dispatch = vi.fn(),
) {
  return render(
    <MemoryRouter>
      <ChallengeView
        challenge={challenge}
        state={save.challenges[challenge.id]}
        onRun={onRun}
        dispatch={dispatch}
        save={save}
        now={new Date('2026-01-01T12:00:00Z')}
      />
    </MemoryRouter>,
  );
}

describe('ChallengeView pass summary', () => {
  it('shows XP, the node stars and the next unpassed challenge on the first pass', async () => {
    const user = userEvent.setup();
    const dispatch = vi.fn().mockReturnValue(passOutcome);

    renderChallengeWithSave(
      fixtureChallenge,
      saveWithPassedChallenges(['n07-c03']),
      vi.fn().mockResolvedValue(passingResult),
      dispatch,
    );

    await user.click(screen.getByRole('button', { name: 'Executar testes' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('+30 XP')).toBeInTheDocument();
    expect(within(dialog).getByText('Estrelas conquistadas')).toBeInTheDocument();
    expect(
      within(dialog).getByRole('img', {
        name: 'Nenhuma estrela nova nesta rodada',
      }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole('link', { name: 'Próximo desafio' }),
    ).toHaveAttribute('href', '/desafio/n07-c02');
  });

  it('does not reopen the summary on later passing runs', async () => {
    const user = userEvent.setup();
    const dispatch = vi.fn().mockReturnValue(passOutcome);

    renderChallengeWithSave(
      fixtureChallenge,
      saveWithPassedChallenges([]),
      vi.fn().mockResolvedValue(passingResult),
      dispatch,
    );

    const runButton = screen.getByRole('button', { name: 'Executar testes' });
    await user.click(runButton);

    const dialog = await screen.findByRole('dialog');
    await user.click(
      within(dialog).getByRole('button', { name: 'Continuar editando' }),
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(runButton);
    await waitFor(() => expect(dispatch).toHaveBeenCalledTimes(2));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getAllByText('passou')).toHaveLength(
      fixtureChallenge.requirements.length,
    );
  });

  it('links to the recommended node when the last challenge passes', async () => {
    const user = userEvent.setup();
    const dispatch = vi.fn().mockReturnValue(passOutcome);
    const lastChallenge: Challenge = { ...fixtureChallenge, id: 'n07-c03' };

    renderChallengeWithSave(
      lastChallenge,
      saveWithPassedChallenges(['n07-c01', 'n07-c02']),
      vi.fn().mockResolvedValue(passingResult),
      dispatch,
    );

    await user.click(screen.getByRole('button', { name: 'Executar testes' }));

    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByRole('link', { name: /\S/ }),
    ).toHaveAttribute('href', '/no/n01?passo=praticar');
  });
});

describe('getChallengeNextHref', () => {
  it('prefers the next unpassed challenge of the same node', () => {
    const save = saveWithPassedChallenges(['n07-c03']);

    expect(
      getChallengeNextHref(
        { id: 'n07-c01', nodeId: 'n07' },
        save,
        {},
        new Date('2026-01-01T12:00:00Z'),
      ),
    ).toBe('/desafio/n07-c02');
  });

  it('falls back to the recommended node when every challenge passed', () => {
    const save = saveWithPassedChallenges(['n07-c01', 'n07-c02', 'n07-c03']);
    const content = {
      challenges: {
        n01: [{ id: 'n01-c01' }],
        n07: [
          { id: 'n07-c01' },
          { id: 'n07-c02' },
          { id: 'n07-c03' },
        ],
      },
    };

    expect(
      getChallengeNextHref(
        { id: 'n07-c03', nodeId: 'n07' },
        save,
        content,
        new Date('2026-01-01T12:00:00Z'),
      ),
    ).toBe('/no/n01?passo=praticar');
  });
});

describe('ChallengeView terminal and session bar', () => {
  const threeReqs: Challenge = {
    ...fixtureChallenge,
    requirements: [
      ...fixtureChallenge.requirements,
      {
        ...fixtureChallenge.requirements[0]!,
        id: 'terceiro',
        label: 'O terceiro requisito.',
      },
    ],
  };
  const mixed = {
    status: 'ok' as const,
    requirements: [
      { id: 'fundo-escuro', passed: true },
      { id: 'titulo-visivel', passed: true },
      { id: 'terceiro', passed: false },
    ],
    errors: [],
  };

  function BarProbe() {
    const bar = useSessionBarState();
    return (
      <output data-testid="bar">{`${bar.value}/${bar.max}/${bar.unit ?? ''}/${bar.exitTo}`}</output>
    );
  }

  function renderThree() {
    return render(
      <MemoryRouter>
        <SessionBarProvider>
          <BarProbe />
          <ChallengeView
            challenge={threeReqs}
            state={emptyState}
            onRun={vi.fn().mockResolvedValue(mixed)}
            dispatch={vi.fn()}
          />
        </SessionBarProvider>
      </MemoryRouter>,
    );
  }

  it('shows only the prompt line before the first run', () => {
    renderThree();
    const terminal = screen.getByRole('log', { name: 'Terminal de testes' });
    expect(terminal).toHaveTextContent('$ executar testes');
    expect(within(terminal).queryByText(/passou|falhou/)).toBeNull();
  });

  it('lists real passou/falhou lines and the count after a run', async () => {
    const user = userEvent.setup();
    renderThree();
    await user.click(screen.getByRole('button', { name: 'Executar testes' }));

    const terminal = await screen.findByRole('log', {
      name: 'Terminal de testes',
    });
    await waitFor(() =>
      expect(terminal.textContent).toMatch(/falhou O terceiro requisito\./),
    );
    const lines = Array.from(terminal.querySelectorAll('div')).map(
      (line) => line.textContent,
    );
    expect(lines[0]).toBe('$ executar testes');
    expect(lines.slice(1).map((l) => l?.split(' ')[0])).toEqual([
      'passou',
      'passou',
      'falhou',
    ]);
    expect(screen.getByText('2 de 3 requisitos')).toBeInTheDocument();
  });

  it('reports passed requirements to the session bar', async () => {
    const user = userEvent.setup();
    renderThree();
    expect(screen.getByTestId('bar')).toHaveTextContent(
      `0/3/requisitos/${'/no/' + threeReqs.nodeId}`,
    );
    await user.click(screen.getByRole('button', { name: 'Executar testes' }));
    await waitFor(() =>
      expect(screen.getByTestId('bar')).toHaveTextContent(
        `2/3/requisitos/${'/no/' + threeReqs.nodeId}`,
      ),
    );
  });
});
