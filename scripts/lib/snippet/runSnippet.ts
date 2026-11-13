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

const DEFAULT_TIMEOUT_MS = 2000;
const TIMEOUT_DETAIL = 'tempo limite de execução excedido';

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
  opts: { timeoutMs?: number } = {},
): SnippetRunner {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  let worker: Worker | null = null;
  let closed = false;
  let queue: Promise<unknown> = Promise.resolve();
  const retiring = new Set<Promise<number>>();

  function spawn(): Worker {
    const next = new Worker(WORKER_URL, {
      env: {},
      execArgv: [],
      resourceLimits: {
        maxOldGenerationSizeMb: 64,
        maxYoungGenerationSizeMb: 16,
      },
    });
    next.unref();
    // A crash between runs must not become an unhandled 'error' event.
    next.on('error', () => {});
    next.on('exit', () => {
      if (worker === next) worker = null;
    });
    return next;
  }

  function detach(): void {
    const current = worker;
    worker = null;
    if (!current) return;
    current.removeAllListeners();
    const termination = current.terminate();
    retiring.add(termination);
    const forget = (): void => {
      retiring.delete(termination);
    };
    void termination.then(forget, forget);
  }

  function runOne(spec: SnippetSpec): Promise<SnippetResult> {
    if (closed) {
      return Promise.resolve({
        ok: false,
        reason: 'crash',
        detail: 'executor encerrado',
      });
    }

    if (!worker) worker = spawn();
    const target = worker;
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
      const execute = (): Promise<SnippetResult> => {
        try {
          return runOne(spec);
        } catch (error) {
          return Promise.resolve({
            ok: false,
            reason: 'crash',
            detail: error instanceof Error ? error.message : String(error),
          });
        }
      };
      const result = queue.then(execute, execute);
      queue = result.then(
        () => undefined,
        () => undefined,
      );
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
