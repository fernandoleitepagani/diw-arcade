import { z } from 'zod';
import {
  ChallengeSchema,
  FlashcardSchema,
  LabGuideSchema,
  PrimerSchema,
  QuestionSchema,
  REPO_URL_PREFIX,
  type Challenge,
  type CodeFiles,
  type Flashcard,
  type LabGuide,
  type Question,
  type Source,
} from '../../src/content/schema';
import {
  LAB_IDS,
  NODE_BY_ID,
  NODE_IDS,
  resolveMinimums,
  type LabId,
  type NodeId,
} from '../../src/content/tree';
import { looksPtBr } from '../../src/lib/text/ptbr';
import { hasEvidence, loadRepoLines, loadSlides, normalize } from './sources';

export type FileKind = 'questions' | 'flashcards' | 'challenges';

export const FILE_KINDS: readonly FileKind[] = [
  'questions',
  'flashcards',
  'challenges',
];

const COLOR_PROPS = new Set([
  'accent-color',
  'background',
  'border',
  'border-bottom',
  'border-left',
  'border-right',
  'border-top',
  'box-shadow',
  'caret-color',
  'color',
  'fill',
  'outline',
  'stroke',
  'text-decoration-color',
  'text-shadow',
]);

const BOOTSTRAP_CHECKS = new Set([
  'exists',
  'count',
  'attr',
  'text',
  'noErrors',
]);

const EVIDENCE_LABS: readonly LabId[] = ['lab-01', 'lab-02', 'lab-03'];

/** Constructs an executed question may not use, even in a string literal. */
const QUESTION_DENYLIST =
  /\b(require|process|import|module|globalThis|Function|eval|WebAssembly|Deno|Bun)\b/;

export interface ContentFile {
  path: string;
  data?: unknown;
  readError?: string;
}

export type ContentFiles = Record<string, unknown> | readonly ContentFile[];

export interface RunChallengeInput {
  challenge: Challenge;
  files: CodeFiles;
}

export interface RunChallengeRequirementResult {
  requirementId: string;
  passed: boolean;
}

export interface RunChallengeResult {
  passed: boolean;
  results?: readonly RunChallengeRequirementResult[];
}

export type RunChallenge = (
  input: RunChallengeInput,
) => RunChallengeResult | Promise<RunChallengeResult>;

export interface SnippetMock {
  status?: number;
  body: unknown;
}

export interface SnippetSpec {
  env: 'js' | 'dom';
  source: string;
  html?: string;
  url?: string;
  mocks?: Record<string, SnippetMock>;
}

export type SnippetOutput =
  | { ok: true; output: string }
  | { ok: false; reason: string; detail: string };

export type RunSnippet = (spec: SnippetSpec) => Promise<SnippetOutput>;

export interface ValidateOptions {
  /** All 14×3 node files and 4 labs are required. */
  requireAll?: boolean;
  /** This node's questions and flashcards (and challenges with --with-challenges) are required. */
  node?: NodeId;
  /** Challenges are required wherever they are expected. */
  withChallenges?: boolean;
  /** When set, evidence is checked against the slide texts. */
  sourcesDir?: string;
  /** When set, repo evidence is checked against the repository files. */
  repoDir?: string;
  /** Validate just this node's files (all three, or one kind) and skip labs. */
  only?: { nodeId: NodeId; kind?: FileKind };
  /** Injected by Task 11; rule 9 is skipped when absent. */
  runChallenge?: RunChallenge;
  /** Injected by Task 3; snippet execution is skipped when absent. */
  runSnippet?: RunSnippet;
  /** Defaults to `src/content`. */
  contentRoot?: string;
}

export interface ValidationError {
  file: string;
  id: string;
  message: string;
  nodeId?: NodeId;
  labId?: LabId;
}

export interface NodeReport {
  nodeId: NodeId;
  questions: number;
  flashcards: number;
  challenges: number;
  ok: boolean;
}

export type EvidenceReport =
  | { status: 'skipped' }
  | { status: 'verified'; verified: number; total: number };

export interface ValidationReport {
  ok: boolean;
  errors: ValidationError[];
  nodes: NodeReport[];
  labs: number;
  evidence: EvidenceReport;
  repoEvidence: EvidenceReport;
  code: EvidenceReport;
}

type Classification =
  | { kind: FileKind; nodeId: NodeId }
  | { kind: 'primer'; nodeId: NodeId }
  | { kind: 'lab'; labId: string }
  | { kind: 'unknown' };

const nodeFilePattern = /(?:^|\/)n(\d{2})\/(questions|flashcards|challenges)\.json$/;
const primerFilePattern = /(?:^|\/)n(\d{2})\/primers\.json$/;
const labFilePattern = /(?:^|\/)labs\/([a-z0-9-]+)\.json$/;

function isNodeId(value: string): value is NodeId {
  return (NODE_IDS as readonly string[]).includes(value);
}

function isLabId(value: string): value is LabId {
  return (LAB_IDS as readonly string[]).includes(value);
}

function classify(path: string): Classification {
  const nodeMatch = nodeFilePattern.exec(path);
  if (nodeMatch) {
    const nodeId = `n${nodeMatch[1]}`;
    const kind = nodeMatch[2] as FileKind;
    if (isNodeId(nodeId)) {
      return { kind, nodeId };
    }
    return { kind: 'unknown' };
  }
  const primerMatch = primerFilePattern.exec(path);
  if (primerMatch) {
    const nodeId = `n${primerMatch[1]}`;
    if (isNodeId(nodeId)) {
      return { kind: 'primer', nodeId };
    }
    return { kind: 'unknown' };
  }
  const labMatch = labFilePattern.exec(path);
  if (labMatch) {
    return { kind: 'lab', labId: labMatch[1] ?? '' };
  }
  return { kind: 'unknown' };
}

function emptyNodeRecord<T>(): Record<NodeId, T[]> {
  return Object.fromEntries(NODE_IDS.map((id) => [id, [] as T[]])) as Record<
    NodeId,
    T[]
  >;
}

function emptyCounts(): Record<
  NodeId,
  { questions: number; flashcards: number; challenges: number }
> {
  return Object.fromEntries(
    NODE_IDS.map((id) => [
      id,
      { questions: 0, flashcards: 0, challenges: 0 },
    ]),
  ) as Record<
    NodeId,
    { questions: number; flashcards: number; challenges: number }
  >;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function extractId(data: unknown, path: readonly PropertyKey[]): string {
  const [first] = path;
  if (typeof first === 'number' && Array.isArray(data)) {
    const item = data[first];
    if (isRecord(item) && typeof item.id === 'string') {
      return item.id;
    }
  }
  if (path.length === 0 && isRecord(data) && typeof data.id === 'string') {
    return data.id;
  }
  return '-';
}

function isColorProp(prop: string): boolean {
  const lower = prop.toLowerCase();
  return lower.endsWith('color') || COLOR_PROPS.has(lower);
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function contentPath(root: string, nodeId: NodeId, kind: FileKind): string {
  return `${root}/${nodeId}/${kind}.json`;
}

/**
 * Validates the parsed content files. Rule 9 runs only when a `runChallenge`
 * callback is injected; every other rule always runs.
 */
export async function validateContent(
  files: ContentFiles,
  opts: ValidateOptions = {},
): Promise<ValidationReport> {
  const root = opts.contentRoot ?? 'src/content';
  const only = opts.only;
  const entries: ContentFile[] = (
    Array.isArray(files)
      ? files.map((file) => ({ ...file }))
      : Object.entries(files).map(([path, data]) => ({ path, data }))
  ).filter((file) => {
    if (!only) {
      return true;
    }
    const classified = classify(file.path);
    return (
      classified.kind !== 'unknown' &&
      classified.kind !== 'lab' &&
      classified.kind !== 'primer' &&
      classified.nodeId === only.nodeId &&
      (only.kind === undefined || classified.kind === only.kind)
    );
  });

  const errors: ValidationError[] = [];
  const questions = emptyNodeRecord<Question>();
  const flashcards = emptyNodeRecord<Flashcard>();
  const challenges = emptyNodeRecord<Challenge>();
  const counts = emptyCounts();
  const present = new Set<string>();
  const seenIds = new Map<string, string>();
  const parsedLabs: LabGuide[] = [];
  const presentLabs = new Set<string>();

  let evidenceVerified = 0;
  let evidenceTotal = 0;
  let repoVerified = 0;
  let repoTotal = 0;
  let codeVerified = 0;
  let codeTotal = 0;
  const slideCache = new Map<string, string[] | null>();
  const repoCache = new Map<string, string[] | null>();

  function addError(
    file: string,
    id: string,
    message: string,
    extra: { nodeId?: NodeId; labId?: LabId } = {},
  ): void {
    errors.push({ file, id, message, ...extra });
  }

  function addSchemaIssues(
    file: string,
    data: unknown,
    error: z.ZodError,
    extra: { nodeId?: NodeId; labId?: LabId },
  ): void {
    for (const issue of error.issues) {
      addError(
        file,
        extractId(data, issue.path),
        `schema: ${issue.path.join('.') || '(raiz)'}: ${issue.message}`,
        extra,
      );
    }
  }

  function verifyEvidence(
    file: string,
    id: string,
    doc: string,
    slide: number,
    evidence: string,
    extra: { nodeId?: NodeId; labId?: LabId },
  ): void {
    if (!opts.sourcesDir) {
      return;
    }
    evidenceTotal += 1;
    let slides = slideCache.get(doc);
    if (slides === undefined) {
      slides = loadSlides(opts.sourcesDir, doc);
      slideCache.set(doc, slides);
    }
    if (slides === null) {
      addError(file, id, `arquivo de fonte ${doc}.txt não encontrado`, extra);
      return;
    }
    if (slide < 1 || slide > slides.length) {
      addError(
        file,
        id,
        `slide ${slide} fora do intervalo (${doc} tem ${slides.length} slides)`,
        extra,
      );
      return;
    }
    if (!hasEvidence(slides, slide, evidence)) {
      addError(file, id, 'evidência não encontrada no slide citado', extra);
      return;
    }
    evidenceVerified += 1;
  }

  function verifyRepoEvidence(
    file: string,
    id: string,
    path: string,
    startLine: number,
    endLine: number,
    evidence: string,
    extra: { nodeId?: NodeId; labId?: LabId },
  ): void {
    if (!opts.repoDir) {
      return;
    }
    repoTotal += 1;
    let lines = repoCache.get(path);
    if (lines === undefined) {
      lines = loadRepoLines(opts.repoDir, path);
      repoCache.set(path, lines);
    }
    if (lines === null) {
      addError(
        file,
        id,
        `arquivo do repositório ${path} não encontrado`,
        extra,
      );
      return;
    }
    if (startLine < 1 || endLine > lines.length) {
      addError(
        file,
        id,
        `intervalo de linhas ${startLine}–${endLine} fora do arquivo (${path} tem ${lines.length} linhas)`,
        extra,
      );
      return;
    }
    const excerpt = lines.slice(startLine - 1, endLine).join('\n');
    if (!normalize(excerpt).includes(normalize(evidence))) {
      addError(
        file,
        id,
        'evidência não encontrada no intervalo de linhas citado',
        extra,
      );
      return;
    }
    repoVerified += 1;
  }

  function checkIdentity(
    item: { id: string; nodeId: NodeId },
    file: string,
    folderNode: NodeId,
  ): void {
    if (item.nodeId !== folderNode) {
      addError(
        file,
        item.id,
        `nodeId ${item.nodeId} não corresponde à pasta ${folderNode}`,
        { nodeId: folderNode },
      );
    }
    if (!item.id.startsWith(`${folderNode}-`)) {
      addError(file, item.id, `id fora do prefixo ${folderNode}-`, {
        nodeId: folderNode,
      });
    }
    const previous = seenIds.get(item.id);
    if (previous !== undefined) {
      addError(file, item.id, `id duplicado (também em ${previous})`, {
        nodeId: folderNode,
      });
    } else {
      seenIds.set(item.id, file);
    }
  }

  function checkSource(
    item: {
      id: string;
      nodeId: NodeId;
      source: Source;
      evidence: string;
    },
    file: string,
    folderNode: NodeId,
  ): void {
    const node = NODE_BY_ID[item.nodeId];
    const source = item.source;
    const extra = { nodeId: folderNode };

    if (!('kind' in source)) {
      if (node && !node.aulas.includes(source.aula)) {
        addError(
          file,
          item.id,
          `aula ${source.aula} não pertence ao nó ${item.nodeId}`,
          extra,
        );
      }
      const doc = `aula-${String(source.aula).padStart(3, '0')}`;
      verifyEvidence(file, item.id, doc, source.slide, item.evidence, extra);
      return;
    }

    switch (source.kind) {
      case 'tiaw': {
        if (!(node?.docs ?? []).includes(source.doc)) {
          addError(
            file,
            item.id,
            `documento ${source.doc} não pertence ao nó ${item.nodeId}`,
            extra,
          );
        }
        verifyEvidence(
          file,
          item.id,
          source.doc,
          source.slide,
          item.evidence,
          extra,
        );
        return;
      }
      case 'orientacao': {
        if (!(node?.docs ?? []).includes('orientacao-prova2')) {
          addError(
            file,
            item.id,
            `documento orientacao-prova2 não pertence ao nó ${item.nodeId}`,
            extra,
          );
        }
        verifyEvidence(
          file,
          item.id,
          'orientacao-prova2',
          1,
          item.evidence,
          extra,
        );
        return;
      }
      case 'repo':
        verifyRepoEvidence(
          file,
          item.id,
          source.path,
          source.startLine,
          source.endLine,
          item.evidence,
          extra,
        );
        return;
    }
  }

  function checkQuestion(item: Question, file: string): void {
    if (!looksPtBr(item.prompt)) {
      addError(file, item.id, 'enunciado não parece estar em PT-BR', {
        nodeId: item.nodeId,
      });
    }
    if (!looksPtBr(item.explanation)) {
      addError(file, item.id, 'explicação não parece estar em PT-BR', {
        nodeId: item.nodeId,
      });
    }
  }

  function checkQuestionCodeStatic(item: Question, file: string): boolean {
    if (item.type === 'tf') {
      return true;
    }
    const { code, expected } = item;
    if (code === undefined && expected === undefined) {
      return true;
    }
    const extra = { nodeId: item.nodeId };
    let ok = true;
    const fail = (message: string): void => {
      addError(file, item.id, message, extra);
      ok = false;
    };

    if (code === undefined || expected === undefined) {
      fail('code e expected devem vir juntos');
      return false;
    }

    if (code.html !== undefined) {
      if (code.env !== 'dom') {
        fail('html só é permitido com env dom');
      }
      if (/<script/i.test(code.html)) {
        fail('html não pode conter <script');
      }
    }
    if (code.url !== undefined) {
      if (code.env !== 'dom') {
        fail('url só é permitida com env dom');
      }
      if (!code.url.startsWith('https://')) {
        fail('url deve começar com https://');
      }
    }

    const blocked = QUESTION_DENYLIST.exec(code.source);
    if (blocked) {
      fail(`código usa construto bloqueado pela denylist: ${blocked[0]}`);
    }

    if (item.type === 'mcq') {
      const marked = item.options[item.answer];
      if (marked !== expected) {
        fail(
          `a opção marcada difere de expected: opção=${JSON.stringify(marked)} esperado=${JSON.stringify(expected)}`,
        );
      }
    } else {
      if (expected.includes('\n')) {
        fail('expected não pode conter quebra de linha');
      }
      if (!item.answers.includes(expected)) {
        fail('expected deve estar entre as respostas aceitas');
      }
    }

    return ok;
  }

  async function checkQuestionCodeExecution(
    item: Question,
    file: string,
    staticOk: boolean,
  ): Promise<void> {
    if (item.type === 'tf' || item.code === undefined) {
      return;
    }
    codeTotal += 1;
    const { code, expected } = item;
    const runner = opts.runSnippet;
    if (!staticOk || expected === undefined || !runner) {
      return;
    }

    const extra = { nodeId: item.nodeId };
    const spec = {
      env: code.env,
      source: code.source,
      ...(code.html === undefined ? {} : { html: code.html }),
      ...(code.url === undefined ? {} : { url: code.url }),
      ...(code.mocks === undefined ? {} : { mocks: code.mocks }),
    };
    const execute = async (): Promise<SnippetOutput | undefined> => {
      try {
        return await runner(spec);
      } catch (error) {
        addError(
          file,
          item.id,
          `falha ao executar o código: ${messageOf(error)}`,
          extra,
        );
        return undefined;
      }
    };

    const first = await execute();
    if (first === undefined) {
      return;
    }
    if (!first.ok) {
      addError(
        file,
        item.id,
        `falha ao executar o código: ${first.reason} ${first.detail}`,
        extra,
      );
      return;
    }
    const second = await execute();
    if (second === undefined) {
      return;
    }
    if (!second.ok) {
      addError(
        file,
        item.id,
        `falha ao executar o código: ${second.reason} ${second.detail}`,
        extra,
      );
      return;
    }
    if (first.output !== second.output) {
      addError(file, item.id, 'saída não determinística', extra);
      return;
    }
    if (first.output !== expected) {
      addError(
        file,
        item.id,
        `saída real difere de expected: real=${JSON.stringify(first.output)} esperado=${JSON.stringify(expected)}`,
        extra,
      );
      return;
    }
    codeVerified += 1;
  }

  function checkFlashcard(item: Flashcard, file: string): void {
    if (!looksPtBr(item.front)) {
      addError(file, item.id, 'frente não parece estar em PT-BR', {
        nodeId: item.nodeId,
      });
    }
    if (!looksPtBr(item.back)) {
      addError(file, item.id, 'verso não parece estar em PT-BR', {
        nodeId: item.nodeId,
      });
    }
  }

  function checkChallengeChecks(item: Challenge, file: string): void {
    const bootstrap = item.libs?.includes('bootstrap') ?? false;
    for (const requirement of item.requirements) {
      const { check } = requirement;
      if (
        (check.kind === 'style' || check.kind === 'media') &&
        isColorProp(check.prop) &&
        check.match.pattern === undefined
      ) {
        addError(
          file,
          item.id,
          `requisito ${requirement.id}: a propriedade de cor ${check.prop} exige um matcher pattern`,
          { nodeId: item.nodeId },
        );
      }
      if (bootstrap && !BOOTSTRAP_CHECKS.has(check.kind)) {
        addError(
          file,
          item.id,
          `requisito ${requirement.id}: desafio Bootstrap não pode usar a verificação ${check.kind}`,
          { nodeId: item.nodeId },
        );
      }
    }
  }

  async function checkChallengeExecution(
    item: Challenge,
    file: string,
  ): Promise<void> {
    const runner = opts.runChallenge;
    if (!runner) {
      return;
    }
    const run = async (
      code: CodeFiles,
      label: string,
    ): Promise<RunChallengeResult | undefined> => {
      try {
        return await runner({ challenge: item, files: code });
      } catch (error) {
        addError(file, item.id, `falha ao executar ${label}: ${messageOf(error)}`, {
          nodeId: item.nodeId,
        });
        return undefined;
      }
    };

    const solution = await run(item.solution, 'a solução de referência');
    if (solution) {
      const failed = (solution.results ?? [])
        .filter((result) => !result.passed)
        .map((result) => result.requirementId);
      if (!solution.passed || failed.length > 0) {
        const detail = failed.length > 0 ? ` em ${failed.join(', ')}` : '';
        addError(
          file,
          item.id,
          `solução de referência falhou${detail}`,
          { nodeId: item.nodeId },
        );
      }
    }

    const starter = await run(item.starter, 'o código inicial');
    if (starter) {
      const results = starter.results;
      const passesAll =
        starter.passed && (results === undefined || results.every((r) => r.passed));
      if (passesAll) {
        addError(
          file,
          item.id,
          'código inicial passa em todos os requisitos',
          { nodeId: item.nodeId },
        );
      }
    }
  }

  function checkMinimums(
    nodeId: NodeId,
    kind: FileKind,
    items: readonly (Question | Flashcard | Challenge)[],
    file: string,
  ): void {
    const minimums = resolveMinimums(NODE_BY_ID[nodeId]);
    if (kind === 'questions') {
      const list = items as readonly Question[];
      if (list.length < minimums.questions) {
        addError(
          file,
          nodeId,
          `mínimo de ${minimums.questions} questões (encontradas ${list.length})`,
          { nodeId },
        );
      }
      const tf = list.filter((item) => item.type === 'tf').length;
      if (tf < 3) {
        addError(file, nodeId, `mínimo de 3 questões verdadeiro/falso (encontradas ${tf})`, {
          nodeId,
        });
      }
      const fill = list.filter((item) => item.type === 'fill').length;
      if (fill < 3) {
        addError(file, nodeId, `mínimo de 3 questões de preenchimento (encontradas ${fill})`, {
          nodeId,
        });
      }
      const executed = list.filter(
        (item) => item.type !== 'tf' && item.code !== undefined,
      ).length;
      if (executed < minimums.executed) {
        addError(
          file,
          nodeId,
          `mínimo de ${minimums.executed} questões executadas (encontradas ${executed})`,
          { nodeId },
        );
      }
      const mcq = list.filter((item) => item.type === 'mcq');
      if (mcq.length >= 8) {
        const answerCounts = new Map<number, number>();
        for (const item of mcq) {
          answerCounts.set(item.answer, (answerCounts.get(item.answer) ?? 0) + 1);
        }
        const mostCommon = Math.max(...answerCounts.values());
        if (mostCommon / mcq.length > 0.5) {
          addError(
            file,
            nodeId,
            `distribuição de respostas concentrada: um índice cobre mais de 50% das ${mcq.length} questões`,
            { nodeId },
          );
        }
      }
    } else if (kind === 'flashcards') {
      if (items.length < minimums.flashcards) {
        addError(
          file,
          nodeId,
          `mínimo de ${minimums.flashcards} flashcards (encontrados ${items.length})`,
          { nodeId },
        );
      }
    } else if (items.length < minimums.challenges) {
      addError(
        file,
        nodeId,
        `mínimo de ${minimums.challenges} desafios (encontrados ${items.length})`,
        { nodeId },
      );
    }
  }

  function validateLab(guide: LabGuide, file: string, stem: string): void {
    const labId = guide.id;
    if (guide.id !== stem) {
      addError(file, guide.id, `id ${guide.id} não corresponde ao arquivo ${stem}`, {
        labId,
      });
    }
    if (!guide.repoUrl.startsWith(REPO_URL_PREFIX)) {
      addError(file, guide.id, `repoUrl deve começar com ${REPO_URL_PREFIX}`, {
        labId,
      });
    }
    const stepIds = guide.steps.map((step) => step.id);
    if (new Set(stepIds).size !== stepIds.length) {
      addError(file, guide.id, 'ids de passos duplicados', { labId });
    }

    if (EVIDENCE_LABS.includes(guide.id)) {
      guide.requirements.forEach((requirement, index) => {
        if (!requirement.source || !requirement.evidence) {
          addError(
            file,
            guide.id,
            `requisito ${index + 1} do ${guide.id} precisa de source e evidence`,
            { labId },
          );
          return;
        }
        const doc = `lab-${String(requirement.source.lab).padStart(2, '0')}`;
        verifyEvidence(
          file,
          guide.id,
          doc,
          requirement.source.slide,
          requirement.evidence,
          { labId },
        );
      });
    } else {
      for (const requirement of guide.requirements) {
        if (requirement.source && requirement.evidence) {
          const doc = `lab-${String(requirement.source.lab).padStart(2, '0')}`;
          verifyEvidence(
            file,
            guide.id,
            doc,
            requirement.source.slide,
            requirement.evidence,
            { labId },
          );
        }
      }
    }
  }

  for (const file of entries) {
    const classified = classify(file.path);
    if (classified.kind === 'unknown') {
      continue;
    }

    if (classified.kind === 'lab') {
      const { labId } = classified;
      if (!isLabId(labId)) {
        addError(file.path, '-', `laboratório desconhecido: ${labId}`);
        continue;
      }
      presentLabs.add(labId);
      if (file.readError) {
        addError(file.path, '-', `JSON inválido: ${file.readError}`, { labId });
        continue;
      }
      const result = LabGuideSchema.safeParse(file.data);
      if (!result.success) {
        addSchemaIssues(file.path, file.data, result.error, { labId });
        continue;
      }
      parsedLabs.push(result.data);
      validateLab(result.data, file.path, labId);
      continue;
    }

    if (classified.kind === 'primer') {
      const { nodeId } = classified;
      if (file.readError) {
        addError(file.path, '-', `JSON inválido: ${file.readError}`, { nodeId });
        continue;
      }
      const result = PrimerSchema.safeParse(file.data);
      if (!result.success) {
        addSchemaIssues(file.path, file.data, result.error, { nodeId });
        continue;
      }
      if (result.data.nodeId !== nodeId) {
        addError(
          file.path,
          '-',
          `nodeId ${result.data.nodeId} não corresponde à pasta ${nodeId}`,
          { nodeId },
        );
      }
      result.data.points.forEach((point, index) => {
        checkSource(
          {
            id: `${nodeId}-p${String(index + 1).padStart(2, '0')}`,
            nodeId,
            source: point.source,
            evidence: point.evidence,
          },
          file.path,
          nodeId,
        );
      });
      continue;
    }

    const { kind, nodeId } = classified;
    present.add(`${nodeId}/${kind}`);
    if (file.readError) {
      addError(file.path, '-', `JSON inválido: ${file.readError}`, { nodeId });
      continue;
    }

    if (kind === 'questions') {
      const result = z.array(QuestionSchema).safeParse(file.data);
      if (!result.success) {
        addSchemaIssues(file.path, file.data, result.error, { nodeId });
        continue;
      }
      counts[nodeId].questions = result.data.length;
      for (const item of result.data) {
        questions[nodeId].push(item);
        checkIdentity(item, file.path, nodeId);
        checkSource(item, file.path, nodeId);
        checkQuestion(item, file.path);
        const staticOk = checkQuestionCodeStatic(item, file.path);
        await checkQuestionCodeExecution(item, file.path, staticOk);
      }
      checkMinimums(nodeId, kind, result.data, file.path);
    } else if (kind === 'flashcards') {
      const result = z.array(FlashcardSchema).safeParse(file.data);
      if (!result.success) {
        addSchemaIssues(file.path, file.data, result.error, { nodeId });
        continue;
      }
      counts[nodeId].flashcards = result.data.length;
      for (const item of result.data) {
        flashcards[nodeId].push(item);
        checkIdentity(item, file.path, nodeId);
        checkSource(item, file.path, nodeId);
        checkFlashcard(item, file.path);
      }
      checkMinimums(nodeId, kind, result.data, file.path);
    } else {
      const result = z.array(ChallengeSchema).safeParse(file.data);
      if (!result.success) {
        addSchemaIssues(file.path, file.data, result.error, { nodeId });
        continue;
      }
      counts[nodeId].challenges = result.data.length;
      for (const item of result.data) {
        challenges[nodeId].push(item);
        checkIdentity(item, file.path, nodeId);
        checkSource(item, file.path, nodeId);
        checkChallengeChecks(item, file.path);
        await checkChallengeExecution(item, file.path);
      }
      checkMinimums(nodeId, kind, result.data, file.path);
    }
  }

  const requiredNodes = new Set<NodeId>();
  if (only) {
    requiredNodes.add(only.nodeId);
  } else {
    if (opts.requireAll) {
      for (const nodeId of NODE_IDS) {
        requiredNodes.add(nodeId);
      }
    }
    if (opts.node) {
      requiredNodes.add(opts.node);
    }
    if (opts.withChallenges && !opts.requireAll && requiredNodes.size === 0) {
      for (const nodeId of NODE_IDS) {
        const hasAny = FILE_KINDS.some((kind) =>
          present.has(`${nodeId}/${kind}`),
        );
        if (hasAny) {
          requiredNodes.add(nodeId);
        }
      }
    }
  }

  const requiredKinds: FileKind[] = only
    ? only.kind
      ? [only.kind]
      : [...FILE_KINDS]
    : ['questions', 'flashcards'];
  if (!only && (opts.requireAll || opts.withChallenges)) {
    requiredKinds.push('challenges');
  }
  for (const nodeId of requiredNodes) {
    for (const kind of requiredKinds) {
      if (!present.has(`${nodeId}/${kind}`)) {
        addError(contentPath(root, nodeId, kind), '-', 'arquivo obrigatório ausente', {
          nodeId,
        });
      }
    }
  }

  if (opts.requireAll && !only) {
    for (const labId of LAB_IDS) {
      if (!presentLabs.has(labId)) {
        addError(`${root}/labs/${labId}.json`, '-', 'arquivo obrigatório ausente', {
          labId,
        });
      }
    }
  }

  const reportedNodes = NODE_IDS.filter((nodeId) => {
    const hasAny = FILE_KINDS.some((kind) =>
      present.has(`${nodeId}/${kind}`),
    );
    return hasAny || requiredNodes.has(nodeId);
  }).map<NodeReport>((nodeId) => {
    const nodeErrors = errors.some((error) => error.nodeId === nodeId);
    return {
      nodeId,
      questions: counts[nodeId].questions,
      flashcards: counts[nodeId].flashcards,
      challenges: counts[nodeId].challenges,
      ok: !nodeErrors,
    };
  });

  const labs = parsedLabs.filter(
    (lab) => !errors.some((error) => error.labId === lab.id),
  ).length;

  return {
    ok: errors.length === 0,
    errors,
    nodes: reportedNodes,
    labs,
    evidence: opts.sourcesDir
      ? { status: 'verified', verified: evidenceVerified, total: evidenceTotal }
      : { status: 'skipped' },
    repoEvidence: opts.repoDir
      ? { status: 'verified', verified: repoVerified, total: repoTotal }
      : { status: 'skipped' },
    code: opts.runSnippet
      ? { status: 'verified', verified: codeVerified, total: codeTotal }
      : { status: 'skipped' },
  };
}

export { resolveMinimums };

export function formatReport(report: ValidationReport): string[] {
  const lines = report.nodes.map(
    (node) =>
      `${node.nodeId} questions=${node.questions} flashcards=${node.flashcards} challenges=${node.challenges} ${node.ok ? 'OK' : 'FAIL'}`,
  );
  for (const error of report.errors) {
    lines.push(`ERROR ${error.file} ${error.id}: ${error.message}`);
  }
  if (report.evidence.status === 'skipped') {
    lines.push('evidence: skipped (DIW_SOURCES not set)');
  } else {
    lines.push(
      `evidence: verified ${report.evidence.verified}/${report.evidence.total}`,
    );
  }
  if (report.repoEvidence.status === 'skipped') {
    lines.push('repo evidence: skipped (DIW_REPO not set)');
  } else {
    lines.push(
      `repo evidence: verified ${report.repoEvidence.verified}/${report.repoEvidence.total}`,
    );
  }
  if (report.code.status === 'skipped') {
    lines.push('code: skipped (executor ausente)');
  } else {
    lines.push(`code: verified ${report.code.verified}/${report.code.total}`);
  }
  if (report.ok) {
    const okNodes = report.nodes.filter((node) => node.ok).length;
    lines.push(
      `content OK: ${okNodes}/${NODE_IDS.length} nodes, ${report.labs} labs`,
    );
  } else {
    lines.push(`content FAILED: ${report.errors.length} errors`);
  }
  return lines;
}
