import type { CodeFiles } from '../../content/schema';
import type { LabId, NodeId } from '../../content/tree';
import type { SrsCard as FsrsSrsCard } from '../srs/fsrs';
import type { SrsCard as StoredSrsCard, SaveV1 } from '../storage/schema';

export type DailyGoal = 20 | 50 | 100;

export type Grade = 1 | 2 | 3 | 4;

export type HintTier = 1 | 2 | 3;

/**
 * The pieces of the content index the progress rules read. Keeping this
 * structural (instead of importing the whole ContentIndex) lets the pure
 * reducer be exercised with tiny fixtures in tests.
 */
export interface ProgressContent {
  questions?: Partial<Record<NodeId, readonly { id: string }[]>>;
  flashcards?: Partial<Record<NodeId, readonly { id: string }[]>>;
  challenges?: Partial<Record<NodeId, readonly { id: string }[]>>;
  labs?: Partial<Record<LabId, { steps: readonly { id: string }[] }>>;
}

export type ProgressEvent =
  | { type: 'onboarding/complete'; dailyGoal?: DailyGoal }
  | {
      type: 'quiz/answer';
      nodeId: NodeId;
      questionId: string;
      correct: boolean;
      firstTry: boolean;
    }
  | {
      type: 'quiz/roundComplete';
      nodeId: NodeId;
      total: number;
      firstTryCorrect: number;
    }
  | { type: 'card/review'; nodeId: NodeId; cardId: string; grade: Grade }
  | { type: 'deck/introduce'; nodeId: NodeId }
  | {
      type: 'challenge/run';
      nodeId: NodeId;
      challengeId: string;
      passed: boolean;
    }
  | {
      type: 'challenge/hint';
      nodeId: NodeId;
      challengeId: string;
      tier: HintTier;
    }
  | { type: 'challenge/saveCode'; challengeId: string; code: CodeFiles }
  | { type: 'lab/step'; labId: LabId; stepId: string; done: boolean }
  | { type: 'primer/read'; nodeId: NodeId }
  | { type: 'settings/update'; patch: Partial<SaveV1['settings']> }
  | { type: 'save/replace'; save: SaveV1 }
  | { type: 'save/reset' };

export interface Outcome {
  xpGained: number;
  levelUp: number | null;
  achievements: string[];
  streakExtended: number | null;
}

/**
 * Compile-time proof that the persisted SRS card schema and the scheduler card
 * describe the same type. `satisfies` fails the build if either direction
 * drifts, so the two modules cannot silently diverge.
 */
export const SRS_CARD_SCHEMA_TO_SCHEDULER = true satisfies StoredSrsCard extends FsrsSrsCard
  ? true
  : false;

export const SRS_CARD_SCHEDULER_TO_SCHEMA = true satisfies FsrsSrsCard extends StoredSrsCard
  ? true
  : false;
