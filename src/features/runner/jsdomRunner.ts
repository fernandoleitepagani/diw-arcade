import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { JSDOM } from 'jsdom';
import type { Challenge, CodeFiles } from '../../content/schema';
import { ResultMessageSchema, type ResultMessage } from './messages';
import { buildSrcdoc, type SrcdocConfig } from './srcdoc';

const ORIGIN = 'https://diw-arcade.local/';
const DEFAULT_TIMEOUT_MS = 3000;
export const TIMEOUT_MESSAGE = 'Tempo esgotado (loop infinito?)';

export interface JsdomRequirementResult {
  requirementId: string;
  passed: boolean;
}

export interface JsdomRunResult {
  passed: boolean;
  results: JsdomRequirementResult[];
}

export interface JsdomRunOptions {
  timeoutMs?: number;
  /** Injectable for tests; defaults to the harness beside this module. */
  harnessSource?: string;
}

function loadHarnessSource(explicit?: string): string {
  return (
    explicit ??
    readFileSync(join(process.cwd(), 'src/features/runner/harness.js'), 'utf8')
  );
}

function timeoutResults(challenge: Challenge): JsdomRequirementResult[] {
  return challenge.requirements.map((requirement) => ({
    requirementId: requirement.id,
    passed: false,
  }));
}

/**
 * Runs one challenge submission under JSDOM with the same srcdoc and harness
 * as the browser. The validator calls this for the reference solution and the
 * starter. It cannot interrupt a synchronous infinite loop; see ADR-0001.
 */
export async function runInJsdom(
  challenge: Challenge,
  files: CodeFiles,
  options: JsdomRunOptions = {},
): Promise<JsdomRunResult> {
  const nonce = randomUUID();
  const config: SrcdocConfig = {
    nonce,
    mode: 'test',
    parentOrigin: ORIGIN,
    requirements: challenge.requirements,
    mocks: challenge.mocks,
  };
  const srcdoc = buildSrcdoc(
    files,
    config,
    loadHarnessSource(options.harnessSource),
  );
  const dom = new JSDOM(srcdoc, {
    runScripts: 'dangerously',
    url: ORIGIN,
    pretendToBeVisual: true,
  });

  // Node would otherwise abort the validator on a rejected user promise.
  // The browser harness records it; JSDOM has no unhandledrejection event.
  const ignoreUnhandled = (): void => {};
  process.on('unhandledRejection', ignoreUnhandled);

  try {
    const message = await new Promise<ResultMessage | null>((resolve) => {
      const timer = setTimeout(
        () => resolve(null),
        options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      );
      const onMessage = (event: MessageEvent): void => {
        const parsed = ResultMessageSchema.safeParse(event.data);
        if (!parsed.success || parsed.data.nonce !== nonce) {
          return;
        }
        clearTimeout(timer);
        dom.window.removeEventListener('message', onMessage);
        resolve(parsed.data);
      };
      dom.window.addEventListener('message', onMessage);
    });

    const results = message
      ? message.requirements.map((result) => ({
          requirementId: result.id,
          passed: result.passed,
        }))
      : timeoutResults(challenge);

    return {
      passed: results.length > 0 && results.every((result) => result.passed),
      results,
    };
  } finally {
    dom.window.close();
    process.off('unhandledRejection', ignoreUnhandled);
  }
}
