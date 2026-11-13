import { describe, expect, it } from 'vitest';
import {
  FillQuestionSchema,
  McqQuestionSchema,
  QuestionSchema,
  TfQuestionSchema,
  type Question,
} from './schema';
import { fixtureQuestions } from '../test/fixtures';

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

function firstTf(): Extract<Question, { type: 'tf' }> {
  const question = fixtureQuestions.find((item) => item.type === 'tf');
  if (!question || question.type !== 'tf') {
    throw new Error('fixture sem questão verdadeiro/falso');
  }
  return question;
}

const code = {
  env: 'js' as const,
  source: "console.log('A');",
};

describe('executed question schema', () => {
  it('parses an mcq with code and expected', () => {
    const parsed = McqQuestionSchema.parse({
      ...firstMcq(),
      code,
      expected: 'A',
    });

    expect(parsed.code).toEqual(code);
    expect(parsed.expected).toBe('A');
  });

  it('parses a fill with code and expected', () => {
    const parsed = FillQuestionSchema.parse({
      ...firstFill(),
      code,
      expected: 'color',
    });

    expect(parsed.code).toEqual(code);
    expect(parsed.expected).toBe('color');
  });

  it('rejects code and expected on a true/false question', () => {
    expect(TfQuestionSchema.safeParse({ ...firstTf(), code }).success).toBe(
      false,
    );
    expect(
      TfQuestionSchema.safeParse({ ...firstTf(), expected: 'A' }).success,
    ).toBe(false);
    expect(QuestionSchema.safeParse({ ...firstTf(), code }).success).toBe(false);
  });

  it('continues to parse a plain true/false question', () => {
    expect(TfQuestionSchema.safeParse(firstTf()).success).toBe(true);
  });
});
