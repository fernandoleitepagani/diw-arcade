import { z } from 'zod';

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

/** Sent on `pagehide`: the frame is being reloaded or navigated away. */
export const UnloadMessageSchema = z.object({
  type: z.literal('diw:unload'),
  nonce: z.string().min(1),
});

export const RunnerMessageSchema = z.discriminatedUnion('type', [
  ReadyMessageSchema,
  ResultMessageSchema,
  StartedMessageSchema,
  UnloadMessageSchema,
]);

export type ReadyMessage = z.infer<typeof ReadyMessageSchema>;
export type ResultMessage = z.infer<typeof ResultMessageSchema>;
export type StartedMessage = z.infer<typeof StartedMessageSchema>;
export type UnloadMessage = z.infer<typeof UnloadMessageSchema>;
export type RunnerMessage = z.infer<typeof RunnerMessageSchema>;
