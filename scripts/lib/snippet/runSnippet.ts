import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Worker } from 'node:worker_threads';

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

export type SnippetResult =
  | { ok: true; output: string }
  | { ok: false; reason: 'timeout' | 'limit' | 'crash'; detail: string };

export interface SnippetRunner {
  run(spec: SnippetSpec): Promise<SnippetResult>;
  close(): Promise<void>;
}

export interface SnippetRunnerOptions {
  timeoutMs?: number;
  startupTimeoutMs?: number;
  /** Test hook: delays the worker's READY signal to simulate a slow boot. */
  startupDelayMs?: number;
}

type ReadyOutcome =
  | { ok: true }
  | { ok: false; reason: 'timeout' | 'crash'; detail: string };

function isReadyMessage(value: unknown): boolean {
  return (
    value !== null &&
    typeof value === 'object' &&
    (value as Record<string, unknown>).type === 'ready'
  );
}

const DEFAULT_TIMEOUT_MS = 2000;
const DEFAULT_STARTUP_TIMEOUT_MS = 30000;
// jsdom retains memory per window, so a long-lived worker eventually hits the
// heap limit under the validation's ~200 runs. A fresh worker resets the heap
// while keeping the per-worker limit as the runaway-memory protection.
const RECYCLE_AFTER_RUNS = 10;
const TIMEOUT_DETAIL = 'tempo limite de execução excedido';
const STARTUP_TIMEOUT_DETAIL =
  'tempo limite de inicialização do executor excedido';

// Vite rewrites `new URL('./x', import.meta.url)` for the app bundle; this
// module is only ever executed by Node, so resolve the sibling file directly.
const WORKER_URL = pathToFileURL(
  join(dirname(fileURLToPath(import.meta.url)), 'worker.mjs'),
);

function parseWorkerResult(value: unknown): SnippetResult | null {
  if (value === null || typeof value !== 'object') return null;
  const result = value as Record<string, unknown>;

  if (result.ok === true && typeof result.output === 'string') {
    return { ok: true, output: result.output };
  }

  if (
    result.ok === false &&
    (result.reason === 'timeout' ||
      result.reason === 'limit' ||
      result.reason === 'crash') &&
    typeof result.detail === 'string'
  ) {
    return {
      ok: false,
      reason: result.reason,
      detail: result.detail,
    };
  }

  return null;
}

export function createSnippetRunner(
  opts: SnippetRunnerOptions = {},
): SnippetRunner {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const startupTimeoutMs =
    opts.startupTimeoutMs ?? DEFAULT_STARTUP_TIMEOUT_MS;

  let worker: Worker | null = null;
  let readiness: Promise<ReadyOutcome> | null = null;
  let runsSinceSpawn = 0;
  let closed = false;
  let queue: Promise<unknown> = Promise.resolve();
  const retiring = new Set<Promise<number>>();

  function spawn(): void {
    const next = new Worker(WORKER_URL, {
      env: {},
      execArgv: [],
      workerData: { startupDelayMs: opts.startupDelayMs ?? 0 },
      resourceLimits: {
        maxOldGenerationSizeMb: 64,
        maxYoungGenerationSizeMb: 16,
      },
    });
    next.unref();
    // A crash between runs must not become an unhandled 'error' event.
    next.on('error', () => {});
    next.on('exit', () => {
      if (worker === next) {
        worker = null;
        readiness = null;
      }
    });

    worker = next;
    runsSinceSpawn = 0;
    readiness = new Promise<ReadyOutcome>((resolve) => {
      let settled = false;

      const settle = (outcome: ReadyOutcome): void => {
        if (settled) return;
        settled = true;
        clearTimeout(startupTimer);
        next.off('message', onReady);
        next.off('error', onFailure);
        next.off('exit', onFailure);
        resolve(outcome);
      };

      const onReady = (value: unknown): void => {
        if (isReadyMessage(value)) settle({ ok: true });
      };

      const onFailure = (reason: unknown): void => {
        settle({
          ok: false,
          reason: 'crash',
          detail:
            typeof reason === 'number'
              ? `worker encerrou com código ${reason}`
              : reason instanceof Error
                ? reason.message
                : String(reason),
        });
      };

      const startupTimer = setTimeout(() => {
        settle({ ok: false, reason: 'timeout', detail: STARTUP_TIMEOUT_DETAIL });
      }, startupTimeoutMs);

      next.on('message', onReady);
      next.on('error', onFailure);
      next.on('exit', onFailure);
    });
  }

  function detach(): void {
    const current = worker;
    worker = null;
    readiness = null;
    if (!current) return;
    current.removeAllListeners();
    const termination = current.terminate();
    retiring.add(termination);
    const forget = (): void => {
      retiring.delete(termination);
    };
    void termination.then(forget, forget);
  }

  async function runOne(spec: SnippetSpec): Promise<SnippetResult> {
    if (closed) {
      return {
        ok: false,
        reason: 'crash',
        detail: 'executor encerrado',
      };
    }

    if (!worker) spawn();
    const target = worker;
    const ready = readiness;
    if (!target || !ready) {
      return {
        ok: false,
        reason: 'crash',
        detail: 'executor indisponível',
      };
    }

    const outcome = await ready;
    if (!outcome.ok) {
      detach();
      return { ok: false, reason: outcome.reason, detail: outcome.detail };
    }
    if (worker !== target) {
      return {
        ok: false,
        reason: 'crash',
        detail: 'worker encerrou durante a inicialização',
      };
    }

    const message = JSON.parse(JSON.stringify(spec)) as SnippetSpec;

    return new Promise<SnippetResult>((resolve) => {
      let settled = false;
      let timedOut = false;

      const finish = (result: SnippetResult): void => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        target.off('message', onMessage);
        target.off('error', onError);
        target.off('exit', onExit);
        resolve(result);
      };

      const onMessage = (value: unknown): void => {
        finish(
          parseWorkerResult(value) ?? {
            ok: false,
            reason: 'crash',
            detail: 'resposta inválida do worker',
          },
        );
      };

      const onError = (error: Error): void => {
        if (timedOut) return;
        detach();
        finish({ ok: false, reason: 'crash', detail: error.message });
      };

      const onExit = (code: number): void => {
        if (timedOut) return;
        worker = null;
        finish({
          ok: false,
          reason: 'crash',
          detail: `worker encerrou com código ${code}`,
        });
      };

      const timer = setTimeout(() => {
        timedOut = true;
        detach();
        finish({ ok: false, reason: 'timeout', detail: TIMEOUT_DETAIL });
      }, timeoutMs);

      target.on('message', onMessage);
      target.on('error', onError);
      target.on('exit', onExit);
      target.postMessage(message);
    });
  }

  return {
    run(spec) {
      const execute = (): Promise<SnippetResult> =>
        runOne(spec).catch(
          (error: unknown): SnippetResult => ({
            ok: false,
            reason: 'crash',
            detail: error instanceof Error ? error.message : String(error),
          }),
        );
      const recycle = (): void => {
        runsSinceSpawn += 1;
        if (runsSinceSpawn >= RECYCLE_AFTER_RUNS) detach();
      };
      const result = queue.then(execute, execute);
      queue = result.then(recycle, recycle);
      return result;
    },

    async close() {
      closed = true;
      await queue;
      detach();
      await Promise.all([...retiring]);
    },
  };
}
