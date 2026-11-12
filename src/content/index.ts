import { z } from 'zod';
import {
  ChallengeSchema,
  FlashcardSchema,
  LabGuideSchema,
  QuestionSchema,
  type Challenge,
  type Flashcard,
  type LabGuide,
  type Question,
} from './schema';
import {
  LAB_IDS,
  NODES,
  NODE_BY_ID,
  NODE_IDS,
  type LabId,
  type NodeId,
  type TreeNode,
} from './tree';

export * from './schema';
export * from './tree';

type FileKind = 'questions' | 'flashcards' | 'challenges';

export interface ContentIndex {
  questions: Record<NodeId, Question[]>;
  flashcards: Record<NodeId, Flashcard[]>;
  challenges: Record<NodeId, Challenge[]>;
  labs: Partial<Record<LabId, LabGuide>>;
}

function emptyNodeRecord<T>(): Record<NodeId, T[]> {
  return Object.fromEntries(NODE_IDS.map((id) => [id, [] as T[]])) as Record<
    NodeId,
    T[]
  >;
}

const nodeFilePattern = /(?:^|\/)n(\d{2})\/(questions|flashcards|challenges)\.json$/;
const labFilePattern = /(?:^|\/)labs\/([a-z0-9-]+)\.json$/;

function isNodeId(value: string): value is NodeId {
  return (NODE_IDS as readonly string[]).includes(value);
}

function isLabId(value: string): value is LabId {
  return (LAB_IDS as readonly string[]).includes(value);
}

function parseModule<T>(
  path: string,
  data: unknown,
  schema: z.ZodType<T[]>,
): T[] {
  const result = schema.safeParse(data);
  if (!result.success) {
    const detail = result.error.issues
      .map((issue) => `${issue.path.join('.') || '(raiz)'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Conteúdo inválido em ${path}: ${detail}`);
  }
  return result.data;
}

/**
 * Parses the eager glob modules. Missing files simply do not appear and become
 * empty arrays, matching the validator's "existing files only" rule.
 */
export function buildContentIndex(
  modules: Record<string, unknown>,
): ContentIndex {
  const questions = emptyNodeRecord<Question>();
  const flashcards = emptyNodeRecord<Flashcard>();
  const challenges = emptyNodeRecord<Challenge>();
  const labs: Partial<Record<LabId, LabGuide>> = {};

  for (const [path, data] of Object.entries(modules)) {
    const nodeMatch = nodeFilePattern.exec(path);
    if (nodeMatch) {
      const nodeId = `n${nodeMatch[1]}`;
      const kind = nodeMatch[2] as FileKind;
      if (!isNodeId(nodeId)) {
        throw new Error(`Nó desconhecido em ${path}`);
      }
      if (kind === 'questions') {
        questions[nodeId].push(
          ...parseModule(path, data, z.array(QuestionSchema)),
        );
      } else if (kind === 'flashcards') {
        flashcards[nodeId].push(
          ...parseModule(path, data, z.array(FlashcardSchema)),
        );
      } else {
        challenges[nodeId].push(
          ...parseModule(path, data, z.array(ChallengeSchema)),
        );
      }
      continue;
    }

    const labMatch = labFilePattern.exec(path);
    if (labMatch) {
      const labId = labMatch[1] ?? '';
      if (!isLabId(labId)) {
        throw new Error(`Laboratório desconhecido em ${path}`);
      }
      labs[labId] = parseModule(path, [data], z.array(LabGuideSchema))[0];
    }
  }

  return { questions, flashcards, challenges, labs };
}

const content = buildContentIndex(
  import.meta.glob(
    [
      './n*/questions.json',
      './n*/flashcards.json',
      './n*/challenges.json',
      './labs/*.json',
    ],
    { eager: true, import: 'default' },
  ),
);

export function getNode(nodeId: NodeId): TreeNode | undefined {
  return NODE_BY_ID[nodeId];
}

export function getQuestions(nodeId: NodeId): Question[] {
  return content.questions[nodeId] ?? [];
}

export function getFlashcards(nodeId: NodeId): Flashcard[] {
  return content.flashcards[nodeId] ?? [];
}

export function getChallenges(nodeId: NodeId): Challenge[] {
  return content.challenges[nodeId] ?? [];
}

export function getChallenge(challengeId: string): Challenge | undefined {
  for (const nodeId of NODE_IDS) {
    const found = content.challenges[nodeId].find(
      (challenge) => challenge.id === challengeId,
    );
    if (found) {
      return found;
    }
  }
  return undefined;
}

export function getLab(labId: LabId): LabGuide | undefined {
  return content.labs[labId];
}

export function getLabs(): LabGuide[] {
  return LAB_IDS.flatMap((labId) => {
    const lab = content.labs[labId];
    return lab ? [lab] : [];
  });
}

export { NODES };
