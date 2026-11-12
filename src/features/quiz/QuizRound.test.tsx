import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { BIT_LINES } from '../../content/copy';
import type { McqQuestion } from '../../content/schema';
import { fixtureQuestions } from '../../test/fixtures';
import { QuizRound } from './QuizRound';

const mcqQuestions = fixtureQuestions.filter(
  (question): question is McqQuestion => question.type === 'mcq',
);

function renderRound(questions = mcqQuestions.slice(0, 2)) {
  const dispatch = vi.fn();
  const onRestart = vi.fn();
  const onExit = vi.fn();

  render(
    <MemoryRouter>
      <QuizRound
        nodeId="n07"
        questions={questions}
        dispatch={dispatch}
        rng={() => 0.999}
        onRestart={onRestart}
        onExit={onExit}
      />
    </MemoryRouter>,
  );

  return { dispatch, onRestart, onExit };
}

describe('QuizRound', () => {
  it('completa uma rodada só com o teclado', async () => {
    const user = userEvent.setup();
    const { dispatch } = renderRound();

    expect(screen.getByText('Questão 1 de 2')).toBeInTheDocument();

    await user.keyboard('1');
    expect(screen.getByRole('radio', { name: 'color' })).toBeChecked();

    await user.keyboard('{Enter}');
    expect(screen.getByText('Correto!')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continuar' })).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(screen.getByText('Questão 2 de 2')).toBeInTheDocument();

    await user.keyboard('2');
    expect(
      screen.getByRole('radio', { name: 'background-color' }),
    ).toBeChecked();

    await user.keyboard('{Enter}');
    expect(screen.getByText('Correto!')).toBeInTheDocument();

    await user.keyboard('{Enter}');

    expect(
      screen.getByRole('heading', { name: 'Rodada concluída' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/2 de 2/)).toBeInTheDocument();
    expect(screen.getByText(/100%/)).toBeInTheDocument();
    expect(screen.getByText('+30')).toBeInTheDocument();
    expect(dispatch).toHaveBeenCalledWith({
      type: 'quiz/roundComplete',
      nodeId: 'n07',
      total: 2,
      firstTryCorrect: 2,
    });
  });

  it('mostra a fonte do slide junto da explicação', async () => {
    const user = userEvent.setup();
    renderRound([mcqQuestions[0] as McqQuestion]);

    await user.keyboard('1');
    await user.keyboard('{Enter}');

    expect(
      screen.getByText(
        'A propriedade color atua diretamente na cor do texto.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Fonte: aula-172, slide 2')).toBeInTheDocument();
  });

  it('usa uma fala do Bit no feedback de acerto', async () => {
    const user = userEvent.setup();
    renderRound([mcqQuestions[0] as McqQuestion]);

    await user.keyboard('1');
    await user.keyboard('{Enter}');

    expect(
      BIT_LINES.correct.some((line) => screen.queryByText(line) !== null),
    ).toBe(true);
  });

  it('usa uma fala do Bit no feedback de erro', async () => {
    const user = userEvent.setup();
    renderRound([mcqQuestions[0] as McqQuestion]);

    await user.keyboard('2');
    await user.keyboard('{Enter}');

    expect(screen.getByText('Incorreto')).toBeInTheDocument();
    expect(
      BIT_LINES.wrong.some((line) => screen.queryByText(line) !== null),
    ).toBe(true);
  });

  it('mantém a pergunta e marca a resposta dada e a correta', async () => {
    const user = userEvent.setup();
    const question = mcqQuestions[0] as McqQuestion;
    renderRound([question]);

    await user.keyboard('2');
    await user.keyboard('{Enter}');

    expect(screen.getByText(question.prompt)).toBeInTheDocument();

    const picked = screen.getByText('background-color').closest('label');
    const correct = screen.getByText('color').closest('label');
    expect(picked).not.toBeNull();
    expect(correct).not.toBeNull();
    expect(
      within(picked as HTMLElement).getByText('Sua resposta'),
    ).toBeInTheDocument();
    expect(
      within(correct as HTMLElement).getByText('Resposta correta'),
    ).toBeInTheDocument();

    for (const radio of screen.getAllByRole('radio')) {
      expect(radio).toBeDisabled();
    }
  });

  it('termina em um resumo com o próximo passo', async () => {
    const user = userEvent.setup();
    renderRound([mcqQuestions[0] as McqQuestion]);

    await user.keyboard('1');
    await user.keyboard('{Enter}');
    await user.keyboard('{Enter}');

    expect(
      screen.getByRole('link', { name: 'Próximo passo' }),
    ).toHaveAttribute('href', '/no/n07');
  });
});
