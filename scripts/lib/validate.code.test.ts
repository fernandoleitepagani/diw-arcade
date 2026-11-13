import { afterAll, describe, expect, it } from 'vitest';
import type {
  Challenge,
  Flashcard,
  Question,
} from '../../src/content/schema';
import {
  fixtureChallenge,
  fixtureFlashcards,
  fixtureQuestions,
} from '../../src/test/fixtures';
import { createSnippetRunner } from './snippet/runSnippet';
import {
  formatReport,
  validateContent,
  type RunSnippet,
} from './validate';

const runner = createSnippetRunner();

afterAll(async () => {
  await runner.close();
});

const runSnippet: RunSnippet = (spec) => runner.run(spec);

function firstMcq(): Extract<Question, { type: 'mcq' }> {
  const question = fixtureQuestions.find((item) => item.type === 'mcq');
  if (!question || question.type !== 'mcq') {
    throw new Error('fixture sem questão de múltipla escolha');
  }
  return question;
}

function firstFill(): Extract<Question, { type: 'fill' }> {
  const question = fixtureQuestions.find((item) => item.type === 'fill');
  if (!question || question.type !== 'fill') {
    throw new Error('fixture sem questão de preenchimento');
  }
  return question;
}

function baseQuestions(): Question[] {
  const extras = Array.from({ length: 3 }, (_, index): Question => {
    const number = index + 13;
    return {
      ...firstMcq(),
      id: `n07-q${String(number).padStart(3, '0')}`,
      prompt: `Qual propriedade define a cor número ${number} do exemplo?`,
      explanation: 'A propriedade color pinta o texto do elemento.',
      answer: 0,
    };
  });
  return [...fixtureQuestions, ...extras];
}

function makeFlashcards(): Flashcard[] {
  const first = fixtureFlashcards[0];
  if (!first) {
    throw new Error('fixture sem flashcard');
  }
  const extras = Array.from({ length: 14 }, (_, index): Flashcard => {
    const number = index + 7;
    return {
      ...first,
      id: `n07-f${String(number).padStart(3, '0')}`,
      front: `Qual é a pergunta extra ${number} sobre propriedades CSS?`,
      back: `Esta é a resposta extra ${number} do cartão.`,
    };
  });
  return [...fixtureFlashcards, ...extras];
}

function makeChallenges(): Challenge[] {
  return [
    fixtureChallenge,
    { ...fixtureChallenge, id: 'n07-c02', title: 'Destaque o cartão 2' },
    { ...fixtureChallenge, id: 'n07-c03', title: 'Destaque o cartão 3' },
  ];
}

function contentWith(question: Question): Record<string, unknown> {
  const questions = baseQuestions();
  const index = questions.findIndex((item) => item.type === question.type);
  questions[index >= 0 ? index : 0] = question;
  return {
    'src/content/n07/questions.json': questions,
    'src/content/n07/flashcards.json': makeFlashcards(),
    'src/content/n07/challenges.json': makeChallenges(),
  };
}

function validate(question: Question) {
  return validateContent(contentWith(question), { runSnippet });
}

const outputSource =
  "console.log('A'); setTimeout(() => console.log('B'), 0); Promise.resolve().then(() => console.log('C'));";

function executedMcq(
  overrides: Record<string, unknown> = {},
): Extract<Question, { type: 'mcq' }> {
  return {
    ...firstMcq(),
    options: ['A\nC\nB', 'A\nB\nC', 'C\nB\nA', 'B\nA\nC'],
    answer: 0,
    code: { env: 'js', source: outputSource },
    expected: 'A\nC\nB',
    ...overrides,
  } as Extract<Question, { type: 'mcq' }>;
}

function messages(report: Awaited<ReturnType<typeof validate>>): string {
  return report.errors.map((error) => error.message).join('\n');
}

describe('executed question rule', () => {
  it('counts a correct executed mcq as verified', async () => {
    const report = await validate(executedMcq());

    expect(report.errors).toEqual([]);
    expect(report.ok).toBe(true);
    expect(report.code).toEqual({ status: 'verified', verified: 1, total: 1 });
    expect(formatReport(report)).toContain('code: verified 1/1');
  });

  it('rejects a deliberately wrong expected value and shows the real output', async () => {
    const report = await validate(
      executedMcq({
        expected: 'errado',
        options: ['errado', 'A\nB\nC', 'C\nB\nA', 'B\nA\nC'],
      }),
    );

    expect(report.code).toEqual({ status: 'verified', verified: 0, total: 1 });
    expect(messages(report)).toContain('real="A\\nC\\nB"');
  });

  it('rejects a marked option that differs from expected', async () => {
    const report = await validate(executedMcq({ answer: 1 }));

    expect(messages(report)).toMatch(/opção marcada/);
  });

  it('rejects a fill whose expected value is not one of its answers', async () => {
    const question: Question = {
      ...firstFill(),
      code: { env: 'js', source: "console.log('color');" },
      expected: 'color',
      answers: ['padding'],
    };

    const report = await validate(question);

    expect(messages(report)).toMatch(/respostas/);
  });

  it('rejects a non-deterministic snippet', async () => {
    const report = await validate(
      executedMcq({
        code: { env: 'js', source: 'console.log(Math.random());' },
        expected: 'x',
        options: ['x', 'a', 'b', 'c'],
      }),
    );

    expect(messages(report)).toMatch(/saída não determinística/);
  });

  it('rejects a snippet that times out', async () => {
    const report = await validate(
      executedMcq({
        code: { env: 'js', source: 'while (true) {}' },
        expected: 'x',
        options: ['x', 'a', 'b', 'c'],
      }),
    );

    expect(messages(report)).toMatch(/falha ao executar o código: timeout/);
  });

  it('rejects a denied construct before running the snippet', async () => {
    const report = await validate(
      executedMcq({
        code: {
          env: 'js',
          source: "const fs = require('fs'); console.log(fs);",
        },
        expected: 'x',
        options: ['x', 'a', 'b', 'c'],
      }),
    );

    const text = messages(report);
    expect(text).toMatch(/denylist/);
    expect(text).toMatch(/require/);
  });

  it('rejects code without expected', async () => {
    const report = await validate(
      executedMcq({ expected: undefined }),
    );

    expect(messages(report)).toMatch(/code e expected/);
  });

  it('rejects html outside the dom environment', async () => {
    const report = await validate(
      executedMcq({
        code: {
          env: 'js',
          source: "console.log('x');",
          html: '<p>Oi</p>',
        },
        expected: 'x',
        options: ['x', 'a', 'b', 'c'],
      }),
    );

    const text = messages(report);
    expect(text).toMatch(/html/);
    expect(text).toMatch(/dom/);
  });
});
