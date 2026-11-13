import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type {
  Challenge,
  Flashcard,
  Question,
  Source,
} from '../../src/content/schema';
import { NODE_IDS } from '../../src/content/tree';
import {
  fixtureAulaSlides,
  fixtureChallenge,
  fixtureFlashcards,
  fixtureLab,
  fixtureLabSlides,
  fixtureOrientacaoText,
  fixtureQuestions,
  fixtureRepoLines,
  fixtureTiawSlides,
} from '../../src/test/fixtures';
import {
  formatReport,
  validateContent,
  type RunChallenge,
  type ValidateOptions,
} from './validate';

function firstMcq(): Extract<Question, { type: 'mcq' }> {
  const question = fixtureQuestions.find((item) => item.type === 'mcq');
  if (!question || question.type !== 'mcq') {
    throw new Error('fixture sem questão de múltipla escolha');
  }
  return question;
}

function firstFlashcard(): Flashcard {
  const flashcard = fixtureFlashcards[0];
  if (!flashcard) {
    throw new Error('fixture sem flashcard');
  }
  return flashcard;
}

function makeQuestions(): Question[] {
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
  const extras = Array.from({ length: 14 }, (_, index): Flashcard => {
    const number = index + 7;
    return {
      ...firstFlashcard(),
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

function validContent(): Record<string, unknown> {
  return {
    'src/content/n07/questions.json': makeQuestions(),
    'src/content/n07/flashcards.json': makeFlashcards(),
    'src/content/n07/challenges.json': makeChallenges(),
    'src/content/labs/lab-01.json': fixtureLab,
  };
}

function fakeRunner(
  options: { solutionPasses?: boolean; starterPasses?: boolean } = {},
): RunChallenge {
  const solutionPasses = options.solutionPasses ?? true;
  const starterPasses = options.starterPasses ?? false;
  return ({ files }) => ({
    passed: files.css.includes(fixtureChallenge.solution.css)
      ? solutionPasses
      : starterPasses,
  });
}

let sourcesDir = '';
let repoDir = '';

beforeEach(() => {
  sourcesDir = mkdtempSync(join(tmpdir(), 'diw-content-'));
  writeFileSync(
    join(sourcesDir, 'aula-172.txt'),
    fixtureAulaSlides.join('\f'),
    'utf8',
  );
  writeFileSync(
    join(sourcesDir, 'lab-01.txt'),
    fixtureLabSlides.join('\f'),
    'utf8',
  );
  writeFileSync(
    join(sourcesDir, 'tiaw-json.txt'),
    fixtureTiawSlides.join('\f'),
    'utf8',
  );
  writeFileSync(
    join(sourcesDir, 'orientacao-prova2.txt'),
    fixtureOrientacaoText,
    'utf8',
  );

  repoDir = mkdtempSync(join(tmpdir(), 'diw-repo-'));
  mkdirSync(join(repoDir, 'PROJETOS', 'exemplo'), { recursive: true });
  writeFileSync(
    join(repoDir, 'PROJETOS', 'exemplo', 'app.js'),
    fixtureRepoLines.join('\n'),
    'utf8',
  );
});

afterEach(() => {
  if (sourcesDir) {
    rmSync(sourcesDir, { recursive: true, force: true });
    sourcesDir = '';
  }
  if (repoDir) {
    rmSync(repoDir, { recursive: true, force: true });
    repoDir = '';
  }
});

function withFile(
  content: Record<string, unknown>,
  path: string,
  data: unknown,
): Record<string, unknown> {
  return { ...content, [path]: data };
}

function options(overrides: Partial<ValidateOptions> = {}): ValidateOptions {
  return { sourcesDir, runChallenge: fakeRunner(), ...overrides };
}

function withFirstQuestionSource(
  source: Source,
  evidence: string,
): Record<string, unknown> {
  const questions = makeQuestions();
  questions[0] = { ...questions[0]!, source, evidence } as Question;
  return withFile(validContent(), 'src/content/n07/questions.json', questions);
}

describe('validator success paths', () => {
  it('accepts complete, consistent content', async () => {
    const report = await validateContent(validContent(), options());

    expect(report.errors).toEqual([]);
    expect(report.ok).toBe(true);
    expect(report.nodes).toEqual([
      { nodeId: 'n07', questions: 15, flashcards: 20, challenges: 3, ok: true },
    ]);
    expect(report.labs).toBe(1);
    expect(report.evidence).toEqual({
      status: 'verified',
      verified: 41,
      total: 41,
    });

    const lines = formatReport(report);
    expect(lines).toContain('n07 questions=15 flashcards=20 challenges=3 OK');
    expect(lines).toContain('evidence: verified 41/41');
    expect(lines.at(-1)).toBe(
      `content OK: 1/${NODE_IDS.length} nodes, 1 labs`,
    );
    expect(lines.slice(-4)).toEqual([
      'evidence: verified 41/41',
      'repo evidence: skipped (DIW_REPO not set)',
      'code: skipped (executor ausente)',
      `content OK: 1/${NODE_IDS.length} nodes, 1 labs`,
    ]);
  });

  it('skips evidence and reports an empty repo cleanly without sources', async () => {
    const report = await validateContent([]);

    expect(report.ok).toBe(true);
    expect(formatReport(report)).toEqual([
      'evidence: skipped (DIW_SOURCES not set)',
      'repo evidence: skipped (DIW_REPO not set)',
      'code: skipped (executor ausente)',
      `content OK: 0/${NODE_IDS.length} nodes, 0 labs`,
    ]);
  });

  it('fails --require-all on an empty repo', async () => {
    const report = await validateContent([], { requireAll: true });

    expect(report.ok).toBe(false);
    expect(report.errors).toHaveLength(NODE_IDS.length * 3 + 4);
    expect(formatReport(report).at(-1)).toBe('content FAILED: 46 errors');
  });

  it('fails --node on an empty repo', async () => {
    const report = await validateContent([], { node: 'n01' });

    expect(report.ok).toBe(false);
    expect(report.errors.map((error) => error.file)).toEqual([
      'src/content/n01/questions.json',
      'src/content/n01/flashcards.json',
    ]);
  });

  it('fails --node with --with-challenges when the challenge file is missing', async () => {
    const content = validContent();
    delete content['src/content/n07/challenges.json'];

    const report = await validateContent(
      content,
      options({ node: 'n07', withChallenges: true }),
    );

    expect(
      report.errors.some(
        (error) =>
          error.file === 'src/content/n07/challenges.json' &&
          /obrigatório/.test(error.message),
      ),
    ).toBe(true);
  });
});

describe('validator identity and source rules', () => {
  it('rejects duplicate ids', async () => {
    const questions = makeQuestions();
    questions[1] = { ...questions[1]!, id: questions[0]!.id };

    const report = await validateContent(
      withFile(validContent(), 'src/content/n07/questions.json', questions),
      options(),
    );

    expect(report.ok).toBe(false);
    expect(report.errors.some((error) => /duplicado/.test(error.message))).toBe(
      true,
    );
  });

  it('rejects a bad answer index', async () => {
    const questions = makeQuestions();
    questions[0] = { ...firstMcq(), id: 'n07-q001', answer: 4 };

    const report = await validateContent(
      withFile(validContent(), 'src/content/n07/questions.json', questions),
      options(),
    );

    expect(report.ok).toBe(false);
    expect(report.errors.length).toBeGreaterThan(0);
  });

  it('rejects an item without a source', async () => {
    const questions = makeQuestions();
    const broken: Record<string, unknown> = { ...questions[0]! };
    delete broken.source;
    questions[0] = broken as unknown as Question;

    const report = await validateContent(
      withFile(validContent(), 'src/content/n07/questions.json', questions),
      options(),
    );

    expect(report.ok).toBe(false);
  });

  it('rejects a missing slide document when sources are set', async () => {
    const report = await validateContent(
      validContent(),
      options({ sourcesDir: join(sourcesDir, 'vazio') }),
    );

    expect(report.ok).toBe(false);
    expect(
      report.errors.some((error) => /não encontrado/.test(error.message)),
    ).toBe(true);
    expect(report.evidence).toEqual({
      status: 'verified',
      verified: 0,
      total: 41,
    });
  });

  it('rejects an aula outside the node', async () => {
    const questions = makeQuestions();
    questions[0] = {
      ...questions[0]!,
      source: { aula: 999, slide: 1 },
    } as Question;

    const report = await validateContent(
      withFile(validContent(), 'src/content/n07/questions.json', questions),
      options(),
    );

    expect(
      report.errors.some((error) => /não pertence ao nó/.test(error.message)),
    ).toBe(true);
  });

  it('rejects a slide out of range', async () => {
    const questions = makeQuestions();
    questions[0] = {
      ...questions[0]!,
      source: { aula: 172, slide: 99 },
    } as Question;

    const report = await validateContent(
      withFile(validContent(), 'src/content/n07/questions.json', questions),
      options(),
    );

    expect(
      report.errors.some((error) => /fora do intervalo/.test(error.message)),
    ).toBe(true);
  });

  it('rejects evidence that is not on the cited slide', async () => {
    const questions = makeQuestions();
    questions[0] = {
      ...questions[0]!,
      evidence: 'Esta evidência não aparece em nenhum slide citado da aula.',
    } as Question;

    const report = await validateContent(
      withFile(validContent(), 'src/content/n07/questions.json', questions),
      options(),
    );

    expect(
      report.errors.some((error) => /evidência não encontrada/.test(error.message)),
    ).toBe(true);
  });

  it('rejects a folder/node mismatch', async () => {
    const report = await validateContent(
      {
        'src/content/n06/questions.json': makeQuestions(),
        'src/content/n06/flashcards.json': makeFlashcards(),
        'src/content/n06/challenges.json': makeChallenges(),
      },
      options(),
    );

    expect(
      report.errors.some((error) => /não corresponde à pasta/.test(error.message)),
    ).toBe(true);
  });
});

describe('validator language, minimum and check rules', () => {
  it('rejects an English prompt', async () => {
    const questions = makeQuestions();
    questions[0] = {
      ...firstMcq(),
      id: 'n07-q001',
      prompt: 'Choose the correct CSS property for the text colour.',
    };

    const report = await validateContent(
      withFile(validContent(), 'src/content/n07/questions.json', questions),
      options(),
    );

    expect(
      report.errors.some((error) => /PT-BR/.test(error.message)),
    ).toBe(true);
  });

  it('rejects below-minimum counts in an existing file', async () => {
    const report = await validateContent(
      {
        'src/content/n07/questions.json': fixtureQuestions,
        'src/content/n07/flashcards.json': fixtureFlashcards,
        'src/content/n07/challenges.json': [fixtureChallenge],
      },
      options(),
    );

    expect(report.ok).toBe(false);
    expect(
      report.errors.some((error) => /mínimo de 15 questões/.test(error.message)),
    ).toBe(true);
    expect(
      report.errors.some((error) => /mínimo de 20 flashcards/.test(error.message)),
    ).toBe(true);
    expect(
      report.errors.some((error) => /mínimo de 3 desafios/.test(error.message)),
    ).toBe(true);
  });

  it('rejects MCQ answer-index skew', async () => {
    const questions: Question[] = Array.from(
      { length: 15 },
      (_, index): Question => ({
        ...firstMcq(),
        id: `n07-q${String(index + 1).padStart(3, '0')}`,
        prompt: `Qual propriedade define a cor número ${index + 1}?`,
        answer: 0,
      }),
    );

    const report = await validateContent(
      withFile(validContent(), 'src/content/n07/questions.json', questions),
      options(),
    );

    expect(
      report.errors.some((error) => /mais de 50%/.test(error.message)),
    ).toBe(true);
  });

  it('rejects a colour check without a pattern matcher', async () => {
    const challenge: Challenge = {
      ...fixtureChallenge,
      requirements: [
        {
          id: 'cor-texto',
          label: 'O texto usa a cor clara.',
          check: {
            kind: 'style',
            selector: '.cartao',
            prop: 'color',
            match: { equals: '#e8eefc' },
          },
        },
        fixtureChallenge.requirements[1]!,
      ],
    };

    const report = await validateContent(
      withFile(validContent(), 'src/content/n07/challenges.json', [challenge]),
      options(),
    );

    expect(
      report.errors.some((error) => /exige um matcher pattern/.test(error.message)),
    ).toBe(true);
  });

  it('rejects a Bootstrap challenge with a style check', async () => {
    const challenge: Challenge = {
      ...fixtureChallenge,
      libs: ['bootstrap'],
    };

    const report = await validateContent(
      withFile(validContent(), 'src/content/n07/challenges.json', [challenge]),
      options(),
    );

    expect(
      report.errors.some((error) => /Bootstrap/.test(error.message)),
    ).toBe(true);
  });
});

describe('validator challenge execution (rule 9)', () => {
  it('rejects a reference solution that fails', async () => {
    const report = await validateContent(
      validContent(),
      options({ runChallenge: fakeRunner({ solutionPasses: false }) }),
    );

    expect(
      report.errors.some((error) => /solução de referência falhou/.test(error.message)),
    ).toBe(true);
  });

  it('rejects a starter that passes every requirement', async () => {
    const report = await validateContent(
      validContent(),
      options({ runChallenge: fakeRunner({ starterPasses: true }) }),
    );

    expect(
      report.errors.some((error) => /código inicial passa/.test(error.message)),
    ).toBe(true);
  });

  it('reports a throwing runner as an error', async () => {
    const throwing: RunChallenge = () => {
      throw new Error('boom');
    };

    const report = await validateContent(
      validContent(),
      options({ runChallenge: throwing }),
    );

    expect(
      report.errors.some((error) => /falha ao executar/.test(error.message)),
    ).toBe(true);
  });
});

describe('validator lab rules', () => {
  function withLab(lab: unknown): Record<string, unknown> {
    const content = validContent();
    content['src/content/labs/lab-01.json'] = lab;
    return content;
  }

  it('rejects a lab with fewer than five steps', async () => {
    const report = await validateContent(
      withLab({ ...fixtureLab, steps: fixtureLab.steps.slice(0, 4) }),
      options(),
    );

    expect(report.ok).toBe(false);
    expect(report.errors.length).toBeGreaterThan(0);
  });

  it('rejects a lab with duplicate step ids', async () => {
    const steps = fixtureLab.steps.map((step) => ({ ...step, id: 'passo' }));
    const report = await validateContent(
      withLab({ ...fixtureLab, steps }),
      options(),
    );

    expect(
      report.errors.some((error) => /passos duplicados/.test(error.message)),
    ).toBe(true);
  });

  it('rejects a lab with fewer than three requirements', async () => {
    const report = await validateContent(
      withLab({
        ...fixtureLab,
        requirements: fixtureLab.requirements.slice(0, 2),
      }),
      options(),
    );

    expect(report.ok).toBe(false);
    expect(report.errors.length).toBeGreaterThan(0);
  });

  it('rejects a lab with a bad repository URL', async () => {
    const report = await validateContent(
      withLab({ ...fixtureLab, repoUrl: 'https://example.com/lab-01' }),
      options(),
    );

    expect(
      report.errors.some((error) => /repoUrl/.test(error.message)),
    ).toBe(true);
  });

  it('rejects a lab-01 requirement without evidence', async () => {
    const requirements = fixtureLab.requirements.map((requirement, index) =>
      index === 0
        ? { text: requirement.text, source: requirement.source }
        : requirement,
    );

    const report = await validateContent(
      withLab({ ...fixtureLab, requirements }),
      options(),
    );

    expect(
      report.errors.some((error) => /precisa de source e evidence/.test(error.message)),
    ).toBe(true);
  });

  it('rejects a lab with an id that does not match the file name', async () => {
    const report = await validateContent(
      {
        ...validContent(),
        'src/content/labs/lab-02.json': fixtureLab,
      },
      options(),
    );

    expect(
      report.errors.some((error) => /não corresponde ao arquivo/.test(error.message)),
    ).toBe(true);
  });
});

describe('validator source kinds', () => {
  it('verifies a tiaw item and rejects a doc outside the node policy', async () => {
    const report = await validateContent(
      withFirstQuestionSource(
        { kind: 'tiaw', doc: 'tiaw-json', slide: 2 },
        'JSON é um formato de texto para troca de dados entre sistemas.',
      ),
      options(),
    );

    expect(
      report.errors.some((error) =>
        /documento tiaw-json não pertence ao nó n07/.test(error.message),
      ),
    ).toBe(true);
    expect(
      report.errors.some(
        (error) =>
          /evidência não encontrada/.test(error.message) ||
          /arquivo de fonte .* não encontrado/.test(error.message),
      ),
    ).toBe(false);
    expect(report.evidence).toEqual({
      status: 'verified',
      verified: 41,
      total: 41,
    });
  });

  it('rejects an orientacao item on a node without orientacao-prova2', async () => {
    const report = await validateContent(
      withFirstQuestionSource(
        { kind: 'orientacao' },
        'A prova tem questões de leitura de código e questões práticas.',
      ),
      options(),
    );

    expect(
      report.errors.some((error) =>
        /documento orientacao-prova2 não pertence ao nó n07/.test(
          error.message,
        ),
      ),
    ).toBe(true);
    expect(
      report.errors.some(
        (error) =>
          /evidência não encontrada/.test(error.message) ||
          /arquivo de fonte .* não encontrado/.test(error.message),
      ),
    ).toBe(false);
  });

  it('verifies a repo item against a file and line range', async () => {
    const report = await validateContent(
      withFirstQuestionSource(
        {
          kind: 'repo',
          path: 'PROJETOS/exemplo/app.js',
          startLine: 1,
          endLine: 2,
        },
        'const total = 0;\ntotal += 1;',
      ),
      options({ repoDir }),
    );

    expect(report.errors).toEqual([]);
    expect(report.ok).toBe(true);
    expect(report.evidence).toEqual({
      status: 'verified',
      verified: 40,
      total: 40,
    });
    expect(report.repoEvidence).toEqual({
      status: 'verified',
      verified: 1,
      total: 1,
    });
  });

  it('rejects a repo range past the end of the file', async () => {
    const report = await validateContent(
      withFirstQuestionSource(
        {
          kind: 'repo',
          path: 'PROJETOS/exemplo/app.js',
          startLine: 10,
          endLine: 12,
        },
        'const total = 0;\ntotal += 1;',
      ),
      options({ repoDir }),
    );

    expect(
      report.errors.some((error) => /fora do arquivo/.test(error.message)),
    ).toBe(true);
    expect(report.repoEvidence).toEqual({
      status: 'verified',
      verified: 0,
      total: 1,
    });
  });

  it('rejects a repo path that escapes the repository', async () => {
    const report = await validateContent(
      withFirstQuestionSource(
        {
          kind: 'repo',
          path: 'PROJETOS/../app.js',
          startLine: 1,
          endLine: 2,
        },
        'const total = 0;\ntotal += 1;',
      ),
      options({ repoDir }),
    );

    expect(
      report.errors.some((error) =>
        /caminho de repositório inválido/.test(error.message),
      ),
    ).toBe(true);
  });

  it('skips repo evidence when DIW_REPO is not set', async () => {
    const report = await validateContent(
      withFirstQuestionSource(
        {
          kind: 'repo',
          path: 'PROJETOS/exemplo/app.js',
          startLine: 1,
          endLine: 2,
        },
        'const total = 0;\ntotal += 1;',
      ),
      options(),
    );

    expect(report.repoEvidence).toEqual({ status: 'skipped' });
    expect(report.code).toEqual({ status: 'skipped' });
    expect(formatReport(report)).toContain(
      'repo evidence: skipped (DIW_REPO not set)',
    );
    expect(formatReport(report)).toContain('code: skipped (executor ausente)');
  });
});

describe('validator --only', () => {
  it('validates just the requested node file', async () => {
    const report = await validateContent(
      validContent(),
      options({ only: { nodeId: 'n07', kind: 'flashcards' } }),
    );

    expect(report.ok).toBe(true);
    expect(report.nodes).toEqual([
      { nodeId: 'n07', questions: 0, flashcards: 20, challenges: 0, ok: true },
    ]);
    expect(report.labs).toBe(0);
    expect(report.evidence).toEqual({
      status: 'verified',
      verified: 20,
      total: 20,
    });
  });

  it('requires only that node file', async () => {
    const content = validContent();
    delete content['src/content/n07/flashcards.json'];

    const report = await validateContent(
      content,
      options({ only: { nodeId: 'n07', kind: 'flashcards' } }),
    );

    expect(report.ok).toBe(false);
    expect(report.errors).toHaveLength(1);
    expect(report.errors[0]).toMatchObject({
      file: 'src/content/n07/flashcards.json',
      message: 'arquivo obrigatório ausente',
    });
  });
});
