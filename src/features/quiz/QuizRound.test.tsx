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

  it('keeps the question counter without a second progress bar', () => {
    renderRound();

    expect(screen.getByText('Questão 1 de 2')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
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

  it('mostra a URL, o HTML de exemplo e o JavaScript acima das alternativas', () => {
    renderRound([codeQuestion()]);

    const region = screen.getByRole('region', { name: 'Código JavaScript' });
    expect(
      within(region).getByText(
        /console\.log\(url\.searchParams\.get\('a'\)\);/,
      ),
    ).toBeInTheDocument();

    const htmlBlock = within(region).getByRole('group', {
      name: 'HTML de exemplo',
    });
    expect(
      within(htmlBlock).getByText('<p id="alvo">Olá</p>'),
    ).toBeInTheDocument();

    const url = within(region).getByText(
      'URL da página: https://example.com/?a=1',
    );
    expect(url).toHaveClass('quiz-round__code-url');

    const codeBlocks = region.querySelectorAll('pre.quiz-round__code-block');
    expect(codeBlocks).toHaveLength(2);
    for (const block of codeBlocks) {
      expect(block).toHaveAttribute('tabindex', '0');
      expect(block.querySelector('code')).not.toBeNull();
    }
  });

  it('expõe o bloco de JavaScript como uma região nomeada', () => {
    const question: McqQuestion = {
      ...(mcqQuestions[0] as McqQuestion),
      id: 'n07-q091',
      prompt: 'O que este código imprime?',
      code: {
        env: 'js',
        source: "const valor = 1;\nconsole.log(valor);",
      },
    };
    renderRound([question]);

    const region = screen.getByRole('region', { name: 'Código JavaScript' });
    const blocks = region.querySelectorAll('pre.quiz-round__code-block');
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toHaveAccessibleName('Código JavaScript');
    expect(blocks[0]).toHaveAttribute('tabindex', '0');
    expect(within(region).queryByText('HTML de exemplo')).not.toBeInTheDocument();
  });

  it('põe cada legenda diretamente acima do bloco que nomeia', () => {
    renderRound([codeQuestion()]);

    const region = screen.getByRole('region', { name: 'Código JavaScript' });
    const captions = Array.from(
      region.querySelectorAll<HTMLElement>('.quiz-round__code-caption'),
    );

    expect(captions.map((caption) => caption.textContent)).toEqual([
      'HTML de exemplo',
      'Código JavaScript',
    ]);

    for (const caption of captions) {
      const block = caption.nextElementSibling;
      expect(block?.tagName).toBe('PRE');
      expect(block).toHaveAccessibleName(caption.textContent ?? '');
    }
  });

  it('liga o grupo de alternativas à figura do código', () => {
    const question = codeQuestion();
    renderRound([question]);

    const region = screen.getByRole('region', { name: 'Código JavaScript' });
    expect(region.id).not.toBe('');

    const group = screen.getByRole('group', { name: question.prompt });
    expect(group).toHaveAttribute('aria-describedby', region.id);
  });

  it('preserva as quebras de linha de uma alternativa', () => {
    const question: McqQuestion = {
      ...codeQuestion(),
      id: 'n07-q090',
      prompt: 'Qual é a ordem impressa?',
      options: ['A\nC\nB', 'A B C', 'B C A', 'C A B'],
      answer: 0,
    };
    renderRound([question]);

    const option = screen.getByText('A\nC\nB', {
      normalizer: (value) => value,
    });
    expect(option).toHaveClass('quiz-round__option-text');
    expect(option.textContent).toBe('A\nC\nB');
  });

  it('não mostra figura quando a pergunta não traz código', () => {
    renderRound([mcqQuestions[0] as McqQuestion]);

    expect(
      screen.queryByRole('region', { name: 'Código JavaScript' }),
    ).not.toBeInTheDocument();
  });
});

function codeQuestion(): McqQuestion {
  return {
    ...(mcqQuestions[0] as McqQuestion),
    id: 'n07-q089',
    prompt: 'O que este código imprime?',
    code: {
      env: 'dom',
      source:
        "const url = new URL('https://example.com/?a=1');\nconsole.log(url.searchParams.get('a'));",
      html: '<p id="alvo">Olá</p>',
      url: 'https://example.com/?a=1',
    },
    options: ['a', '1', 'Olá', 'undefined'],
    answer: 0,
  };
}
