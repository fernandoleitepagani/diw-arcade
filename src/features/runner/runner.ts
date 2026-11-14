import type { CodeFiles, JsonValue, Requirement } from '../../content/schema';
import harnessSource from './harness.js?raw';
import {
  RunnerMessageSchema,
  type RequirementResult,
} from './messages';
import { buildSrcdoc, SANDBOX_FLAGS, type SrcdocConfig } from './srcdoc';

export const TIMEOUT_MESSAGE = 'Tempo esgotado (loop infinito?)';
export const NAVIGATION_MESSAGE =
  'O código recarregou ou navegou a página (location.reload / location.href).';
export const START_FAILED_MESSAGE =
  'O ambiente de testes não iniciou. Tente executar de novo.';

export interface RunInIframeOptions {
  mode: 'preview' | 'test';
  requirements?: readonly Requirement[];
  mocks?: Record<string, JsonValue>;
  libs?: readonly 'bootstrap'[];
  /**
   * Total budget from srcdoc assignment to the answer. It catches async
   * stalls; a synchronous loop only when the browser isolates the sandboxed
   * frame in its own process (see ADR-0001).
   */
  timeoutMs?: number;
  /** Max wait for `diw:started`; capped by `timeoutMs`. */
  startTimeoutMs?: number;
}

export interface RunResult {
  status: 'ok' | 'timeout';
  requirements: RequirementResult[];
  errors: string[];
}

async function loadLibCss(
  libs: readonly string[] | undefined,
): Promise<string> {
  if (!libs?.includes('bootstrap')) {
    return '';
  }
  try {
    const module = await import('bootstrap/dist/css/bootstrap.min.css?raw');
    return module.default;
  } catch {
    return '';
  }
}

/**
 * Runs user code in a fresh, sandboxed iframe and resolves with the harness
 * result. The parent owns two timers and the lifecycle state machine
 * (loading, running, settled); see ADR-0001 "Timeout policy".
 */
export function runInIframe(
  container: HTMLElement,
  files: CodeFiles,
  options: RunInIframeOptions,
): { iframe: HTMLIFrameElement; result: Promise<RunResult> } {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('sandbox', SANDBOX_FLAGS);
  container.appendChild(iframe);

  const nonce = crypto.randomUUID();
  const requirements = options.requirements ?? [];
  const config: SrcdocConfig = {
    nonce,
    mode: options.mode,
    parentOrigin: window.location.origin,
    requirements,
    mocks: options.mocks,
  };

  const result = new Promise<RunResult>((resolve) => {
    type Phase = 'loading' | 'running' | 'settled';
    let phase: Phase = 'loading';
    let startTimer: number | undefined;
    let totalTimer: number | undefined;

    function settle(value: RunResult): void {
      phase = 'settled';
      window.clearTimeout(startTimer);
      window.clearTimeout(totalTimer);
      window.removeEventListener('message', onMessage);
      resolve(value);
    }

    function fail(message: string): void {
      iframe.remove();
      settle({
        status: 'timeout',
        requirements: requirements.map((requirement) => ({
          id: requirement.id,
          passed: false,
          message,
        })),
        errors: [message],
      });
    }

    function onMessage(event: MessageEvent): void {
      if (event.source !== iframe.contentWindow) {
        return;
      }
      const parsed = RunnerMessageSchema.safeParse(event.data);
      if (!parsed.success || parsed.data.nonce !== nonce) {
        return;
      }
      const message = parsed.data;
      switch (message.type) {
        case 'diw:started':
          if (phase === 'loading') {
            phase = 'running';
            window.clearTimeout(startTimer);
          } else {
            fail(NAVIGATION_MESSAGE);
          }
          return;
        case 'diw:unload':
          fail(NAVIGATION_MESSAGE);
          return;
        case 'diw:ready':
        case 'diw:result':
          settle({
            status: 'ok',
            requirements:
              message.type === 'diw:result' ? message.requirements : [],
            errors: message.errors,
          });
          return;
      }
    }

    window.addEventListener('message', onMessage);

    void loadLibCss(options.libs).then((libCss) => {
      if (phase === 'settled') {
        return;
      }
      const totalMs = options.timeoutMs ?? 3000;
      const startMs = Math.min(options.startTimeoutMs ?? 1000, totalMs);
      iframe.srcdoc = buildSrcdoc(files, config, harnessSource, libCss);
      startTimer = window.setTimeout(() => fail(START_FAILED_MESSAGE), startMs);
      totalTimer = window.setTimeout(() => {
        if (phase === 'running') {
          fail(TIMEOUT_MESSAGE);
        }
      }, totalMs);
    });
  });

  return { iframe, result };
}
