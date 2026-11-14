import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import type { McqQuestion, Question } from '../../content/schema';
import { SessionLayout } from '../../app/SessionLayout';
import { fixtureQuestions } from '../../test/fixtures';
import { QuizRound } from './QuizRound';

const mcqQuestions = fixtureQuestions.filter(
  (question): question is McqQuestion => question.type === 'mcq',
);

function renderRound(
  questions: readonly Question[] = mcqQuestions.slice(0, 2),
) {
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

/** Renders the round under the session layout so the bar counter is visible. */
function renderInSession(questions: readonly Question[]) {
  const dispatch = vi.fn();
  const router = createMemoryRouter(
    [
      {
        element: <SessionLayout />,
        children: [
          {
            path: '/',
            element: (
              <QuizRound
                nodeId="n07"
                questions={questions}
                dispatch={dispatch}
                rng={() => 0.999}
                onRestart={vi.fn()}
                onExit={vi.fn()}
              />
            ),
          },
        ],
      },
    ],
    { initialEntries: ['/'] },
  );
  render(<RouterProvider router={router} />);
  return { dispatch };
}

function tenQuestions(): Question[] {
  const base = mcqQuestions[0] as McqQuestion;
  return Array.from({ length: 10 }, (_, index) => ({
    ...base,
    id: `n07-q${String(100 + index)}`,
  }));
}

describe('QuizRound', () => {
  // v4: options are buttons that answer on click or A-D/1-4; there is no
  // Responder step and the counter lives in the session bar ("n de m").
  it('completa uma rodada só com o teclado', async () => {
    const user = userEvent.setup();
    const { dispatch } = renderRound();

    await user.keyboard('1');
    expect(screen.getByText('Correto.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continuar' })).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(screen.queryByText('Correto.')).not.toBeInTheDocument();

    await user.keyboard('2');
    expect(screen.getByText('Correto.')).toBeInTheDocument();

    await user.keyboard('{Enter}');

    expect(
      screen.getByRole('heading', { name: 'Rodada concluída' }),
    ).toBeInTheDocument();
    expect(screen.getByText('2 de 2')).toBeInTheDocument();
    expect(screen.getByText('+30')).toBeInTheDocument();
    expect(dispatch).toHaveBeenCalledWith({
      type: 'quiz/roundComplete',
      nodeId: 'n07',
      total: 2,
      firstTryCorrect: 2,
    });
  });

  // v4: clicking an option answers at once; the payload is unchanged.
  it('clicar na alternativa B responde com o mesmo evento de antes', async () => {
    const user = userEvent.setup();
    const { dispatch } = renderRound([mcqQuestions[0] as McqQuestion]);

    await user.click(screen.getByRole('button', { name: 'background-color' }));

    expect(dispatch).toHaveBeenCalledWith({
      type: 'quiz/answer',
      nodeId: 'n07',
      questionId: 'n07-q001',
      correct: false,
      firstTry: false,
    });
  });

  it('a tecla c responde com a terceira alternativa', async () => {
    const user = userEvent.setup();
    const { dispatch } = renderRound([mcqQuestions[0] as McqQuestion]);

    await user.keyboard('c');

    expect(dispatch).toHaveBeenCalledWith({
      type: 'quiz/answer',
      nodeId: 'n07',
      questionId: 'n07-q001',
      correct: false,
      firstTry: false,
    });
  });

  it('não há botão Responder em múltipla escolha', () => {
    renderRound([mcqQuestions[0] as McqQuestion]);

    expect(
      screen.queryByRole('button', { name: 'Responder' }),
    ).not.toBeInTheDocument();
  });

  it('o erro mostra "Quase." e "A resposta é" a certa', async () => {
    const user = userEvent.setup();
    renderRound([mcqQuestions[0] as McqQuestion]);

    await user.keyboard('b');

    const bar = screen.getByRole('status');
    expect(within(bar).getByText('Quase.')).toBeInTheDocument();
    expect(within(bar).getByText(/A resposta é/)).toBeInTheDocument();
    expect(within(bar).getByText('color')).toBeInTheDocument();
  });

  it('a barra da sessão mostra "1 de 10"', async () => {
    renderInSession(tenQuestions());

    expect(await screen.findByText('1 de 10')).toBeInTheDocument();
  });

  it('o resumo mostra "Você acertou" com os acertos de primeira e Fixar com N cartas', async () => {
    const user = userEvent.setup();
    renderRound(tenQuestions());

    // two wrong first tries (retried later), then every question right.
    await user.keyboard('b');
    await user.keyboard('{Enter}');
    await user.keyboard('b');
    await user.keyboard('{Enter}');
    for (let i = 0; i < 10; i += 1) {
      await user.keyboard('a');
      await user.keyboard('{Enter}');
    }

    expect(screen.getByText('Você acertou')).toBeInTheDocument();
    expect(screen.getByText('8 de 10')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Fixar com \d+ cartas/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nova rodada' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Voltar ao nó' })).toBeInTheDocument();
  });

  it('mostra a fonte do slide junto da explicação', async () => {
    const user = userEvent.setup();
    renderRound([mcqQuestions[0] as McqQuestion]);

    await user.keyboard('1');

    expect(
      screen.getByText(
        'A propriedade color atua diretamente na cor do texto.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Fonte: aula 172, slide 2')).toBeInTheDocument();
  });

  // v4: the feedback bar carries the Bit sprite and the "Quase." title; the
  // pickLine Bit lines now live only in the summary.
  it('o feedback de erro usa o título "Quase." e o sprite do Bit', async () => {
    const user = userEvent.setup();
    renderRound([mcqQuestions[0] as McqQuestion]);

    await user.keyboard('2');

    expect(screen.getByText('Quase.')).toBeInTheDocument();
    expect(screen.queryByText('Incorreto')).not.toBeInTheDocument();
    expect(document.querySelector('.quiz-round__sprite svg')).not.toBeNull();
  });

  it('mantém a pergunta e marca a resposta dada e a correta', async () => {
    const user = userEvent.setup();
    const question = mcqQuestions[0] as McqQuestion;
    renderRound([question]);

    await user.keyboard('2');

    expect(screen.getByText(question.prompt)).toBeInTheDocument();

    // v4: options are aria-disabled buttons, not disabled radios.
    const picked = screen.getByRole('button', { name: /background-color/ });
    const correct = screen.getByRole('button', { name: /^color/ });
    expect(
      within(picked).getByText('Sua resposta'),
    ).toBeInTheDocument();
    expect(
      within(correct).getByText('Resposta correta'),
    ).toBeInTheDocument();
    expect(picked).toHaveClass('bad');
    expect(correct).toHaveClass('ok');

    const group = screen.getByRole('group', { name: question.prompt });
    for (const option of within(group).getAllByRole('button')) {
      expect(option).toHaveAttribute('aria-disabled', 'true');
      expect(option).not.toBeDisabled();
    }
  });

  it('termina em um resumo com o próximo passo', async () => {
    const user = userEvent.setup();
    renderRound([mcqQuestions[0] as McqQuestion]);

    await user.keyboard('1');
    await user.keyboard('{Enter}');

    // v4: the primary CTA is "Fixar com N cartas" while the node has new cards.
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', '/no/n07/cartas');
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

describe('QuizRound atalhos e feedback', () => {
  const tf = fixtureQuestions.filter((q) => q.type === 'tf').slice(0, 1);
  const fill = fixtureQuestions.filter((q) => q.type === 'fill').slice(0, 1);

  // v4: a letter key answers at once, so each key is checked on its own round.
  it.each([
    ['b', 1],
    ['D', 3],
    ['a', 0],
    ['3', 2],
  ])('a tecla %s responde com a alternativa %i no mcq', async (key, index) => {
    const user = userEvent.setup();
    const dispatch = vi.fn();
    render(
      <MemoryRouter>
        <QuizRound
          nodeId="n07"
          questions={[mcqQuestions[0] as McqQuestion]}
          dispatch={dispatch}
          rng={() => 0.999}
          onRestart={vi.fn()}
          onExit={vi.fn()}
        />
      </MemoryRouter>,
    );

    await user.keyboard(key);
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'quiz/answer',
        correct: index === (mcqQuestions[0] as McqQuestion).answer,
      }),
    );
  });

  // v4: C and D do nothing in true/false; A and B answer at once.
  it('em verdadeiro ou falso só A e B respondem', async () => {
    const user = userEvent.setup();
    const { dispatch } = renderRound(tf);

    await user.keyboard('c');
    await user.keyboard('4');
    expect(dispatch).not.toHaveBeenCalled();
    expect(
      screen.queryByRole('button', { name: 'Responder' }),
    ).not.toBeInTheDocument();
    await user.keyboard('b');
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it('não dispara atalhos ao digitar em um campo de texto', async () => {
    const user = userEvent.setup();
    const { dispatch } = renderRound(fill);

    const input = screen.getByRole('textbox', { name: 'Sua resposta' });
    await user.type(input, 'abcd1');
    expect(input).toHaveValue('abcd1');
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
    expect(dispatch).not.toHaveBeenCalled();
  });

  // v4: the hint copy follows the prototype; fill keeps Responder.
  it('mostra a dica em português', () => {
    renderRound([mcqQuestions[0] as McqQuestion]);

    expect(
      screen.getByText(
        'Dica: as teclas A a D escolhem a resposta e Enter continua.',
      ),
    ).toBeInTheDocument();
  });

  // v4: fill questions keep the input and a Responder button; Enter submits.
  it('pergunta de preencher mantém o campo, o botão Responder e o Enter', async () => {
    const user = userEvent.setup();
    const { dispatch } = renderRound(fill);

    expect(screen.getByRole('button', { name: 'Responder' })).toBeDisabled();
    await user.type(
      screen.getByRole('textbox', { name: 'Sua resposta' }),
      'x{Enter}',
    );

    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'quiz/answer', correct: false }),
    );
  });

  it('o feedback fica numa barra de status com veredito, explicação e fonte', async () => {
    const user = userEvent.setup();
    renderRound([mcqQuestions[0] as McqQuestion]);

    await user.keyboard('a');

    const bar = screen.getByRole('status');
    expect(within(bar).getByText('Correto.')).toBeInTheDocument();
    expect(within(bar).getByText('Fonte: aula 172, slide 2')).toBeInTheDocument();
    expect(
      within(bar).getByRole('button', { name: 'Continuar' }),
    ).toHaveFocus();
  });

  it('usa um sprite de pixel no feedback, sem o mascote', async () => {
    const user = userEvent.setup();
    renderRound([mcqQuestions[0] as McqQuestion]);

    await user.keyboard('a');

    expect(document.querySelector('.mascot')).toBeNull();
    expect(document.querySelector('.quiz-round__sprite svg')).not.toBeNull();
  });
});
