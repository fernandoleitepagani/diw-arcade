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
import type { CodeFiles } from '../../content/schema';
import { fixtureChallenge } from '../../test/fixtures';
import type { RunResult } from '../runner/runner';
import { ChallengeView } from './ChallengeView';

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
    expect(within(dialog).getByText('Próximo passo')).toBeInTheDocument();
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
