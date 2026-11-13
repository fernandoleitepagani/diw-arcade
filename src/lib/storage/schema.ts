import { z } from 'zod';

const isoDateTime = z.iso.datetime();
const dayKey = z.iso.date();
const cardState = z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]);
const reviewGrade = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
]);
const dailyGoal = z.union([z.literal(20), z.literal(50), z.literal(100)]);
const hintsUsed = z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]);

export const SrsCardSchema = z.object({
  due: isoDateTime,
  stability: z.number().nonnegative(),
  difficulty: z.number().nonnegative(),
  elapsedDays: z.number().int().nonnegative(),
  scheduledDays: z.number().int().nonnegative(),
  learningSteps: z.number().int().nonnegative(),
  reps: z.number().int().nonnegative(),
  lapses: z.number().int().nonnegative(),
  state: cardState,
  lastReview: isoDateTime.nullable(),
});

const DayStatsSchema = z.object({
  xp: z.number().int().nonnegative().default(0),
  quiz: z.number().int().nonnegative().default(0),
  cards: z.number().int().nonnegative().default(0),
  challenges: z.number().int().nonnegative().default(0),
  labs: z.number().int().nonnegative().default(0),
});

const SettingsSchema = z
  .object({
    dailyGoal: dailyGoal.default(50),
    sound: z.boolean().default(false),
    newCardsPerDay: z.number().int().min(0).max(200).default(20),
    reviewsPerDay: z.number().int().min(0).max(1000).default(100),
  })
  .prefault({});

const QuizAnswerSchema = z.object({
  seen: z.number().int().nonnegative(),
  correct: z.number().int().nonnegative(),
  lastCorrect: z.boolean(),
});

const QuizRoundSchema = z.object({
  best: z.number().int().nonnegative(),
  count: z.number().int().nonnegative(),
  perfect: z.boolean(),
});

const QuizSchema = z
  .object({
    answers: z.record(z.string(), QuizAnswerSchema).default({}),
    rounds: z.record(z.string(), QuizRoundSchema).default({}),
  })
  .prefault({});

const ReviewSchema = z.object({
  cardId: z.string().min(1),
  grade: reviewGrade,
  at: isoDateTime,
});

const CodeFilesSchema = z.object({
  html: z.string(),
  css: z.string(),
  js: z.string(),
});

const ChallengeProgressSchema = z.object({
  passed: z.boolean(),
  failedRuns: z.number().int().nonnegative(),
  hintsUsed,
  xpAwarded: z.number().int().nonnegative(),
  code: CodeFilesSchema.nullable(),
});

const LabStepProgressSchema = z.object({
  done: z.boolean(),
  xpAwarded: z.boolean(),
});

export const SaveV2Schema = z.object({
  schemaVersion: z.literal(2),
  createdAt: isoDateTime,
  onboarded: z.boolean().default(false),
  xpTotal: z.number().int().nonnegative(),
  days: z.record(dayKey, DayStatsSchema).default({}),
  settings: SettingsSchema,
  quiz: QuizSchema,
  cards: z.record(z.string(), SrsCardSchema).default({}),
  introduced: z.record(z.string(), dayKey).default({}),
  reviews: z.array(ReviewSchema).default([]),
  challenges: z.record(z.string(), ChallengeProgressSchema).default({}),
  labs: z
    .record(z.string(), z.record(z.string(), LabStepProgressSchema))
    .default({}),
  achievements: z.record(z.string(), isoDateTime).default({}),
  primersRead: z.record(z.string(), isoDateTime).default({}),
});

/** Alias kept so existing call sites compile; validates the current (v2) shape. */
export const SaveV1Schema = SaveV2Schema;

export type SrsCard = z.infer<typeof SrsCardSchema>;
/** Expand-contract: the name stays SaveV1 but describes the stored (v2) shape. */
export type SaveV1 = z.infer<typeof SaveV2Schema>;
export type SaveV2 = SaveV1;
