import { z } from 'zod';
import { LAB_IDS, NODE_IDS, TIAW_DOCS } from './tree';

export const NODE_ID_SCHEMA = z.enum(NODE_IDS);
export const LAB_ID_SCHEMA = z.enum(LAB_IDS);

/** `PROJETOS/` path with safe segments ending in a source extension. */
export const SAFE_REPO_PATH =
  /^(?!.*\.\.)PROJETOS\/(?:(?!\.)[^/\\]+\/)*(?!\.)[^/\\]+\.(?:js|html|css|json)$/;

/** Legacy form: one of the node's aulas. */
export const AulaSourceSchema = z
  .object({
    aula: z.number().int().positive(),
    slide: z.number().int().min(1),
  })
  .strict();

export const TiawSourceSchema = z
  .object({
    kind: z.literal('tiaw'),
    doc: z.enum(TIAW_DOCS),
    slide: z.number().int().min(1),
  })
  .strict();

export const RepoSourceSchema = z
  .object({
    kind: z.literal('repo'),
    path: z.string().regex(SAFE_REPO_PATH, 'caminho de repositório inválido'),
    startLine: z.number().int().min(1),
    endLine: z.number().int().min(1),
  })
  .strict()
  .refine((source) => source.endLine >= source.startLine, {
    message: 'endLine deve ser maior ou igual a startLine',
    path: ['endLine'],
  })
  .refine((source) => source.endLine - source.startLine <= 80, {
    message: 'o intervalo de linhas não pode passar de 80',
    path: ['endLine'],
  });

export const OrientacaoSourceSchema = z
  .object({
    kind: z.literal('orientacao'),
  })
  .strict();

export const SourceSchema = z.union([
  AulaSourceSchema,
  z.discriminatedUnion('kind', [
    TiawSourceSchema,
    RepoSourceSchema,
    OrientacaoSourceSchema,
  ]),
]);

/** Verbatim excerpt from the cited slide (whitespace may differ). */
export const EvidenceSchema = z.string().min(20).max(300);

export type Source = z.infer<typeof SourceSchema>;
export type AulaSource = z.infer<typeof AulaSourceSchema>;
export type Evidence = z.infer<typeof EvidenceSchema>;

function countMatcherKeys(value: { equals?: string; oneOf?: string[]; pattern?: string }): number {
  return [value.equals, value.oneOf, value.pattern].filter((entry) => entry !== undefined).length;
}

export const MatcherSchema = z
  .object({
    equals: z.string().optional(),
    oneOf: z.array(z.string().min(1)).min(1).optional(),
    /** RegExp source, matched case-insensitively. */
    pattern: z.string().min(1).optional(),
  })
  .superRefine((value, ctx) => {
    if (countMatcherKeys(value) !== 1) {
      ctx.addIssue({
        code: 'custom',
        message: 'o matcher deve ter exatamente um de equals, oneOf ou pattern',
      });
    }
    if (value.pattern !== undefined) {
      try {
        new RegExp(value.pattern, 'i');
      } catch {
        ctx.addIssue({
          code: 'custom',
          message: `pattern inválido: ${value.pattern}`,
          path: ['pattern'],
        });
      }
    }
  });

export type Matcher = z.infer<typeof MatcherSchema>;

export const ActionSchema = z.discriminatedUnion('do', [
  z.object({ do: z.literal('click'), selector: z.string().min(1) }),
  z.object({ do: z.literal('input'), selector: z.string().min(1), value: z.string() }),
  z.object({ do: z.literal('wait'), ms: z.number().int().min(0).max(1000) }),
]);

export type Action = z.infer<typeof ActionSchema>;

const conditionSchema = z
  .string()
  .min(1)
  .refine(
    (value) => {
      try {
        new RegExp(value, 'i');
        return true;
      } catch {
        return false;
      }
    },
    { message: 'condition deve ser uma expressão regular válida' },
  );

export const CheckSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('exists'), selector: z.string().min(1) }),
  z.object({
    kind: z.literal('count'),
    selector: z.string().min(1),
    min: z.number().int().min(0),
    max: z.number().int().min(0).optional(),
  }),
  z.object({
    kind: z.literal('attr'),
    selector: z.string().min(1),
    name: z.string().min(1),
    match: MatcherSchema.optional(),
  }),
  z.object({
    kind: z.literal('text'),
    selector: z.string().min(1),
    match: MatcherSchema,
  }),
  z.object({
    kind: z.literal('style'),
    selector: z.string().min(1),
    prop: z.string().min(1),
    match: MatcherSchema,
  }),
  z.object({
    kind: z.literal('media'),
    condition: conditionSchema,
    selector: z.string().min(1),
    prop: z.string().min(1),
    match: MatcherSchema,
  }),
  z.object({ kind: z.literal('noErrors') }),
]);

export type Check = z.infer<typeof CheckSchema>;

export const RequirementSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  before: z.array(ActionSchema).optional(),
  check: CheckSchema,
});

export type Requirement = z.infer<typeof RequirementSchema>;

const questionBase = {
  id: z.string().regex(/^n\d{2}-q\d{3}$/, 'id deve seguir nNN-qNNN'),
  nodeId: NODE_ID_SCHEMA,
  explanation: z.string().min(1),
  source: SourceSchema,
  evidence: EvidenceSchema,
};

export const McqQuestionSchema = z.object({
  ...questionBase,
  type: z.literal('mcq'),
  prompt: z.string().min(1),
  options: z
    .array(z.string().min(1))
    .length(4)
    .refine((options) => new Set(options).size === options.length, {
      message: 'as opções devem ser únicas',
    }),
  answer: z.number().int().min(0).max(3),
});

export const TfQuestionSchema = z.object({
  ...questionBase,
  type: z.literal('tf'),
  prompt: z.string().min(1),
  answer: z.boolean(),
});

export const FillQuestionSchema = z.object({
  ...questionBase,
  type: z.literal('fill'),
  prompt: z
    .string()
    .min(1)
    .refine((prompt) => prompt.split('____').length === 2, {
      message: 'o enunciado deve conter exatamente um "____"',
    }),
  answers: z.array(z.string().min(1)).min(1),
});

export const QuestionSchema = z.discriminatedUnion('type', [
  McqQuestionSchema,
  TfQuestionSchema,
  FillQuestionSchema,
]);

export type McqQuestion = z.infer<typeof McqQuestionSchema>;
export type TfQuestion = z.infer<typeof TfQuestionSchema>;
export type FillQuestion = z.infer<typeof FillQuestionSchema>;
export type Question = z.infer<typeof QuestionSchema>;

export const FlashcardSchema = z.object({
  id: z.string().regex(/^n\d{2}-f\d{3}$/, 'id deve seguir nNN-fNNN'),
  nodeId: NODE_ID_SCHEMA,
  front: z.string().min(1),
  back: z.string().min(1),
  source: SourceSchema,
  evidence: EvidenceSchema,
});

export type Flashcard = z.infer<typeof FlashcardSchema>;

export const CodeFilesSchema = z.object({
  /** A <body> fragment. */
  html: z.string(),
  css: z.string(),
  js: z.string(),
});

export type CodeFiles = z.infer<typeof CodeFilesSchema>;

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export const JsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(JsonValueSchema),
    z.record(z.string(), JsonValueSchema),
  ]),
);

export const ChallengeSchema = z
  .object({
    id: z.string().regex(/^n\d{2}-c\d{2}$/, 'id deve seguir nNN-cNN'),
    nodeId: NODE_ID_SCHEMA,
    title: z.string().min(1),
    kind: z.enum(['html', 'css', 'js']),
    goal: z.string().min(1),
    starter: CodeFilesSchema,
    solution: CodeFilesSchema,
    requirements: z.array(RequirementSchema).min(2).max(6),
    hints: z.tuple([z.string().min(1), z.string().min(1), z.string().min(1)]),
    mocks: z.record(z.string(), JsonValueSchema).optional(),
    libs: z.array(z.literal('bootstrap')).optional(),
    source: SourceSchema,
    evidence: EvidenceSchema,
  })
  .superRefine((challenge, ctx) => {
    const ids = challenge.requirements.map((requirement) => requirement.id);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({
        code: 'custom',
        message: 'os ids dos requisitos devem ser únicos',
        path: ['requirements'],
      });
    }
  });

export type Challenge = z.infer<typeof ChallengeSchema>;

export const LabRequirementSchema = z.object({
  text: z.string().min(1),
  source: z
    .object({
      lab: z.union([z.literal(1), z.literal(2), z.literal(3)]),
      slide: z.number().int().min(1),
    })
    .optional(),
  evidence: EvidenceSchema.optional(),
});

export type LabRequirement = z.infer<typeof LabRequirementSchema>;

export const LabStepSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/, 'id deve usar apenas letras minúsculas, números e hífen'),
  title: z.string().min(1),
  /** Paragraphs separated by "\n\n". */
  body: z.string().min(1),
  checklist: z.array(z.string().min(1)).optional(),
  code: z
    .object({
      lang: z.enum(['html', 'css', 'js', 'bash', 'json']),
      text: z.string(),
    })
    .optional(),
  repoPath: z.string().min(1).optional(),
});

export type LabStep = z.infer<typeof LabStepSchema>;

export const LabTipsSchema = z
  .object({
    html: z.array(z.string().min(1)),
    css: z.array(z.string().min(1)),
    js: z.array(z.string().min(1)),
  })
  .refine(
    (tips) =>
      [tips.html, tips.css, tips.js].some((list) =>
        list.some((tip) => tip.trim().length > 0),
      ),
    { message: 'pelo menos uma lista de dicas deve ter conteúdo' },
  );

export type LabTips = z.infer<typeof LabTipsSchema>;

export const REPO_URL_PREFIX =
  'https://github.com/joaopauloaramuni/desenvolvimento-de-interfaces-web';

export const LabGuideSchema = z.object({
  id: LAB_ID_SCHEMA,
  title: z.string().min(1),
  summary: z.string().min(1),
  repoUrl: z.string().min(1),
  repoPaths: z.array(z.string().min(1)).min(1),
  requirements: z.array(LabRequirementSchema).min(3),
  tips: LabTipsSchema,
  steps: z.array(LabStepSchema).min(5),
});

export type LabGuide = z.infer<typeof LabGuideSchema>;
