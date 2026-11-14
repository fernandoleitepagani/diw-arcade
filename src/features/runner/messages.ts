import { z } from 'zod';

/** Failure texts shown for every requirement; single source for app, tests and probe. */
export const TIMEOUT_MESSAGE = 'Tempo esgotado (loop infinito?)';
export const NAVIGATION_MESSAGE =
  'O código recarregou ou navegou a página (location.reload / location.href).';
export const START_FAILED_MESSAGE =
  'O ambiente de testes não iniciou. Tente executar de novo.';

/** One requirement's grade inside a `diw:result` message. */
export const RequirementResultSchema = z.object({
  id: z.string().min(1),
  passed: z.boolean(),
  message: z.string().optional(),
});

export type RequirementResult = z.infer<typeof RequirementResultSchema>;

/** Sent after load in preview mode. */
export const ReadyMessageSchema = z.object({
  type: z.literal('diw:ready'),
  nonce: z.string().min(1),
  errors: z.array(z.string()),
});

/** Sent after load in test mode. */
export const ResultMessageSchema = z.object({
  type: z.literal('diw:result'),
  nonce: z.string().min(1),
  requirements: z.array(RequirementResultSchema),
  errors: z.array(z.string()),
});

/** Sent synchronously when the harness starts, before student code. */
export const StartedMessageSchema = z.object({
  type: z.literal('diw:started'),
  nonce: z.string().min(1),
});

/**
 * Sent on `pagehide` and `beforeunload`: the frame may be reloaded or
 * navigated away. Provisional, because `beforeunload` also fires for
 * navigations that never unload the page (`mailto:`, `tel:`).
 */
export const UnloadMessageSchema = z.object({
  type: z.literal('diw:unload'),
  nonce: z.string().min(1),
});

/** Sent shortly after a `beforeunload` the document outlived: cancels the pending unload failure. */
export const SurvivedMessageSchema = z.object({
  type: z.literal('diw:survived'),
  nonce: z.string().min(1),
});

export const RunnerMessageSchema = z.discriminatedUnion('type', [
  ReadyMessageSchema,
  ResultMessageSchema,
  StartedMessageSchema,
  UnloadMessageSchema,
  SurvivedMessageSchema,
]);

export type ReadyMessage = z.infer<typeof ReadyMessageSchema>;
export type ResultMessage = z.infer<typeof ResultMessageSchema>;
export type StartedMessage = z.infer<typeof StartedMessageSchema>;
export type UnloadMessage = z.infer<typeof UnloadMessageSchema>;
export type SurvivedMessage = z.infer<typeof SurvivedMessageSchema>;
export type RunnerMessage = z.infer<typeof RunnerMessageSchema>;
