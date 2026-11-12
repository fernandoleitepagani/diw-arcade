import type { CodeFiles, JsonValue, Requirement } from '../../content/schema';
import harnessSource from './harness.js?raw';
import {
  RunnerMessageSchema,
  type RequirementResult,
} from './messages';
import { buildSrcdoc, type SrcdocConfig } from './srcdoc';

export const TIMEOUT_MESSAGE = 'Tempo esgotado (loop infinito?)';

export interface RunInIframeOptions {
  mode: 'preview' | 'test';
  requirements?: readonly Requirement[];
  mocks?: Record<string, JsonValue>;
  libs?: readonly 'bootstrap'[];
  /** A timeout also catches synchronous infinite loops in the iframe. */
  timeoutMs?: number;
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
 * result. The parent page owns the timeout, so a synchronous loop in the
 * frame cannot block the app.
 */
export function runInIframe(
  container: HTMLElement,
  files: CodeFiles,
  options: RunInIframeOptions,
): { iframe: HTMLIFrameElement; result: Promise<RunResult> } {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('sandbox', 'allow-scripts');
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
    let settled = false;
    let timer: number | undefined;

    function finish(value: RunResult): void {
      if (settled) {
        return;
      }
      settled = true;
      if (timer !== undefined) {
        window.clearTimeout(timer);
      }
      window.removeEventListener('message', onMessage);
      resolve(value);
    }

    function onMessage(event: MessageEvent): void {
      if (event.source !== iframe.contentWindow) {
        return;
      }
      const parsed = RunnerMessageSchema.safeParse(event.data);
      if (!parsed.success || parsed.data.nonce !== nonce) {
        return;
      }
      finish({
        status: 'ok',
        requirements:
          parsed.data.type === 'diw:result' ? parsed.data.requirements : [],
        errors: parsed.data.errors,
      });
    }

    window.addEventListener('message', onMessage);

    void loadLibCss(options.libs).then((libCss) => {
      if (settled) {
        return;
      }
      iframe.srcdoc = buildSrcdoc(files, config, harnessSource, libCss);
      timer = window.setTimeout(() => {
        iframe.remove();
        finish({
          status: 'timeout',
          requirements: requirements.map((requirement) => ({
            id: requirement.id,
            passed: false,
            message: TIMEOUT_MESSAGE,
          })),
          errors: [],
        });
      }, options.timeoutMs ?? 3000);
    });
  });

  return { iframe, result };
}
