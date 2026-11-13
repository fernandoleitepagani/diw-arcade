import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  ChallengeSchema,
  FlashcardSchema,
  LabGuideSchema,
  MatcherSchema,
  McqQuestionSchema,
  QuestionSchema,
  SourceSchema,
  type Question,
} from './schema';
import { LAB_IDS, NODES, NODE_IDS, UNITS, resolveMinimums } from './tree';
import {
  fixtureChallenge,
  fixtureFlashcards,
  fixtureLab,
  fixtureQuestions,
} from '../test/fixtures';

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

describe('content fixtures', () => {
  it('parses the 12 mixed questions', () => {
    const parsed = z.array(QuestionSchema).parse(fixtureQuestions);

    expect(parsed).toHaveLength(12);
    expect(parsed.filter((item) => item.type === 'mcq')).toHaveLength(6);
    expect(parsed.filter((item) => item.type === 'tf')).toHaveLength(3);
    expect(parsed.filter((item) => item.type === 'fill')).toHaveLength(3);
  });

  it('parses the 6 flashcards', () => {
    expect(z.array(FlashcardSchema).parse(fixtureFlashcards)).toHaveLength(6);
  });

  it('parses the CSS challenge and the lab guide', () => {
    expect(ChallengeSchema.parse(fixtureChallenge).kind).toBe('css');
    const lab = LabGuideSchema.parse(fixtureLab);
    expect(lab.steps).toHaveLength(5);
    expect(lab.requirements).toHaveLength(3);
  });
});

describe('question schema', () => {
  it('rejects duplicate MCQ options', () => {
    const mcq = firstMcq();
    const result = McqQuestionSchema.safeParse({
      ...mcq,
      options: ['color', 'color', 'margin', 'padding'],
    });

    expect(result.success).toBe(false);
  });

  it('rejects an out-of-range MCQ answer index', () => {
    const mcq = firstMcq();
    expect(McqQuestionSchema.safeParse({ ...mcq, answer: 4 }).success).toBe(false);
  });

  it('rejects a fill prompt without exactly one blank', () => {
    const fill = firstFill();
    expect(
      QuestionSchema.safeParse({
        ...fill,
        prompt: 'A ____ e a ____ definem o texto.',
      }).success,
    ).toBe(false);
    expect(
      QuestionSchema.safeParse({ ...fill, prompt: 'Sem lacuna alguma.' }).success,
    ).toBe(false);
  });

  it('rejects short evidence', () => {
    const mcq = firstMcq();
    expect(McqQuestionSchema.safeParse({ ...mcq, evidence: 'curta' }).success).toBe(
      false,
    );
  });

  it('rejects an unknown node id', () => {
    const mcq = firstMcq();
    const result = QuestionSchema.safeParse({ ...mcq, nodeId: 'n99' });
    expect(result.success).toBe(false);
  });
});

describe('matcher schema', () => {
  it('requires exactly one matcher key', () => {
    expect(MatcherSchema.safeParse({}).success).toBe(false);
    expect(
      MatcherSchema.safeParse({ equals: 'a', oneOf: ['a'] }).success,
    ).toBe(false);
    expect(MatcherSchema.safeParse({ equals: 'a' }).success).toBe(true);
  });

  it('rejects an invalid pattern', () => {
    expect(MatcherSchema.safeParse({ pattern: '[' }).success).toBe(false);
    expect(MatcherSchema.safeParse({ pattern: '#0a1128' }).success).toBe(true);
  });
});

describe('challenge schema', () => {
  it('requires three hints and unique requirement ids', () => {
    expect(
      ChallengeSchema.safeParse({ ...fixtureChallenge, hints: ['a', 'b'] }).success,
    ).toBe(false);

    const duplicate = {
      ...fixtureChallenge,
      requirements: [
        fixtureChallenge.requirements[0],
        { ...fixtureChallenge.requirements[1], id: 'fundo-escuro' },
      ],
    };
    expect(ChallengeSchema.safeParse(duplicate).success).toBe(false);
  });
});

describe('source schema', () => {
  it('parses the legacy aula form unchanged', () => {
    expect(SourceSchema.parse({ aula: 172, slide: 2 })).toEqual({
      aula: 172,
      slide: 2,
    });
  });

  it('accepts every explicit kind', () => {
    expect(
      SourceSchema.safeParse({ kind: 'tiaw', doc: 'tiaw-json', slide: 3 })
        .success,
    ).toBe(true);
    expect(
      SourceSchema.safeParse({ kind: 'orientacao' }).success,
    ).toBe(true);
    expect(
      SourceSchema.safeParse({
        kind: 'repo',
        path: 'PROJETOS/exemplo/app.js',
        startLine: 1,
        endLine: 2,
      }).success,
    ).toBe(true);
  });

  it('rejects an unknown kind', () => {
    expect(
      SourceSchema.safeParse({ kind: 'podcast', slide: 1 }).success,
    ).toBe(false);
  });

  it('rejects unsafe repo paths', () => {
    const unsafe = [
      'PROJETOS/../app.js',
      '/PROJETOS/app.js',
      'PROJETOS\\app.js',
      'PROJETOS/a..b.js',
      'PROJETOS/app.txt',
      'OUTRO/app.js',
    ];
    for (const path of unsafe) {
      expect(
        SourceSchema.safeParse({
          kind: 'repo',
          path,
          startLine: 1,
          endLine: 2,
        }).success,
      ).toBe(false);
    }
  });

  it('limits a repo range to 80 lines and rejects an inverted range', () => {
    const base = {
      kind: 'repo' as const,
      path: 'PROJETOS/app.js',
      startLine: 1,
    };
    expect(SourceSchema.safeParse({ ...base, endLine: 81 }).success).toBe(true);
    expect(SourceSchema.safeParse({ ...base, endLine: 82 }).success).toBe(
      false,
    );
    expect(
      SourceSchema.safeParse({ ...base, startLine: 2, endLine: 1 }).success,
    ).toBe(false);
  });

  it('rejects a tiaw doc outside the allowlist', () => {
    expect(
      SourceSchema.safeParse({ kind: 'tiaw', doc: 'aula-172', slide: 1 })
        .success,
    ).toBe(false);
  });
});

describe('lab schema', () => {
  it('requires at least five steps and three requirements', () => {
    expect(
      LabGuideSchema.safeParse({
        ...fixtureLab,
        steps: fixtureLab.steps.slice(0, 4),
      }).success,
    ).toBe(false);
    expect(
      LabGuideSchema.safeParse({
        ...fixtureLab,
        requirements: fixtureLab.requirements.slice(0, 2),
      }).success,
    ).toBe(false);
  });

  it('requires at least one non-empty tip list', () => {
    expect(
      LabGuideSchema.safeParse({
        ...fixtureLab,
        tips: { html: [], css: [], js: [] },
      }).success,
    ).toBe(false);
  });
});

describe('tree', () => {
  it('has five units covering the fourteen nodes', () => {
    expect(UNITS.map((unit) => unit.id)).toEqual(['u1', 'u2', 'u3', 'u4', 'u5']);
    expect(
      UNITS.map((unit) => ({
        id: unit.id,
        title: unit.title,
        nodes: [...unit.nodes],
      })),
    ).toEqual([
      { id: 'u1', title: 'Fundamentos da Web', nodes: ['n01', 'n02'] },
      { id: 'u2', title: 'HTML', nodes: ['n03', 'n04', 'n05'] },
      { id: 'u3', title: 'CSS', nodes: ['n06', 'n07', 'n08', 'n09'] },
      { id: 'u4', title: 'Design e Mobile', nodes: ['n10', 'n11', 'n12'] },
      { id: 'u5', title: 'Dados e JavaScript', nodes: ['n13', 'n14'] },
    ]);
    expect(UNITS.flatMap((unit) => unit.nodes)).toEqual([...NODE_IDS]);
  });

  it('matches the node table exactly', () => {
    expect(
      NODES.map((node) => ({
        id: node.id,
        title: node.title,
        aulas: [...node.aulas],
        unitId: node.unitId,
      })),
    ).toEqual([
      { id: 'n01', title: 'Introdução à Web e tecnologias', aulas: [110, 120], unitId: 'u1' },
      {
        id: 'n02',
        title: 'Arquitetura, URI/URL/URN e dinâmica da Web',
        aulas: [130, 131, 150],
        unitId: 'u1',
      },
      { id: 'n03', title: 'Sintaxe e elementos HTML', aulas: [160, 161], unitId: 'u2' },
      { id: 'n04', title: 'Formulários', aulas: [162], unitId: 'u2' },
      { id: 'n05', title: 'Semântica', aulas: [163], unitId: 'u2' },
      { id: 'n06', title: 'CSS: introdução e sintaxe', aulas: [170, 171], unitId: 'u3' },
      { id: 'n07', title: 'Propriedades CSS', aulas: [172], unitId: 'u3' },
      { id: 'n08', title: 'Viewport e Media Queries', aulas: [173], unitId: 'u3' },
      { id: 'n09', title: 'Flexbox e Grid', aulas: [174], unitId: 'u3' },
      { id: 'n10', title: 'UX Design e projeto web', aulas: [210], unitId: 'u4' },
      { id: 'n11', title: 'Web e computação móvel', aulas: [220], unitId: 'u4' },
      { id: 'n12', title: 'Bootstrap', aulas: [230], unitId: 'u4' },
      { id: 'n13', title: 'JSON e APIs', aulas: [240, 250], unitId: 'u5' },
      { id: 'n14', title: 'Introdução ao JavaScript', aulas: [310], unitId: 'u5' },
    ]);
    expect(NODES).toHaveLength(14);
  });

  it('lists the four lab ids', () => {
    expect([...LAB_IDS]).toEqual(['lab-01', 'lab-02', 'lab-03', 'jsonserver']);
  });

  it('resolves the default minimums (15/20/3/0)', () => {
    expect(resolveMinimums(NODES[0]!)).toEqual({
      questions: 15,
      flashcards: 20,
      challenges: 3,
      executed: 0,
    });
  });
});
