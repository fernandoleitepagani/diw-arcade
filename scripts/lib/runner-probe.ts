import { randomUUID } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Browser, BrowserContext, Page } from 'playwright';
import { z } from 'zod';
import {
  ChallengeSchema,
  type Challenge,
  type CodeFiles,
  type Requirement,
} from '../../src/content/schema';
import {
  buildSrcdoc,
  SANDBOX_FLAGS,
  type SrcdocConfig,
} from '../../src/features/runner/srcdoc';

/**
 * Sonda do runner no Chromium real: o iframe usa o mesmo sandbox, o mesmo
 * srcdoc e o mesmo harness do app. O jsdom não implementa a submissão de
 * formulários nem o bloqueio do sandbox, então só aqui o gate é fiel.
 */

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const HARNESS = readFileSync(
  join(ROOT, 'src/features/runner/harness.js'),
  'utf8',
);
const BOOTSTRAP_CSS = readFileSync(
  join(ROOT, 'node_modules/bootstrap/dist/css/bootstrap.min.css'),
  'utf8',
);
const CASE_CAP_MS = 5000;
/** Tempo para uma navegação indevida do pai ou um popup aparecerem. */
const SETTLE_MS = 400;
/** Janela de observação dos sinais de ciclo de vida e limite do AC4. */
const NAVIGATION_WINDOW_MS = 2500;
const NAVIGATION_LIMIT_MS = 1500;
const SAVE_KEY = 'diw-arcade:save';
const E2E_ID = 'n20-c02';
/** Teto de espera pelos resultados na página real (o timeout do runner é maior que o limite). */
const E2E_CAP_MS = 12_000;
const NAVIGATION_MESSAGE =
  'O código recarregou ou navegou a página (location.reload / location.href).';
const LOOP_MESSAGE = 'Tempo esgotado (loop infinito?)';

interface CaseInput {
  files: CodeFiles;
  requirements: readonly Requirement[];
  mocks?: Challenge['mocks'];
  libs?: Challenge['libs'];
}

interface CaseOutcome {
  /** Resultado do harness; `null` quando nenhum diw:result chegou no prazo. */
  requirements: { id: string; passed: boolean; message?: string }[] | null;
  errors: string[];
  results: number;
  elapsedMs: number;
}

interface ProbeEnv {
  page: Page;
  context: BrowserContext;
  origin: string;
}

function loadChallenges(): Challenge[] {
  const contentDir = join(ROOT, 'src/content');
  const challenges: Challenge[] = [];
  for (const entry of readdirSync(contentDir).sort()) {
    if (!/^n\d{2}$/.test(entry)) {
      continue;
    }
    let raw: string;
    try {
      raw = readFileSync(join(contentDir, entry, 'challenges.json'), 'utf8');
    } catch {
      continue;
    }
    challenges.push(...z.array(ChallengeSchema).parse(JSON.parse(raw)));
  }
  return challenges;
}

async function runCase(env: ProbeEnv, input: CaseInput): Promise<CaseOutcome> {
  const nonce = randomUUID();
  const config: SrcdocConfig = {
    nonce,
    mode: 'test',
    parentOrigin: env.origin,
    requirements: input.requirements,
    mocks: input.mocks,
  };
  const libCss = input.libs?.includes('bootstrap') ? BOOTSTRAP_CSS : '';
  const srcdoc = buildSrcdoc(input.files, config, HARNESS, libCss);

  return env.page.evaluate(
    ({ srcdoc, nonce, sandbox, capMs }) =>
      new Promise<CaseOutcome>((resolve) => {
        const iframe = document.createElement('iframe');
        iframe.setAttribute('sandbox', sandbox);
        const startedAt = performance.now();
        let results = 0;
        let settled = false;

        function finish(outcome: Omit<CaseOutcome, 'elapsedMs' | 'results'>) {
          if (settled) {
            return;
          }
          settled = true;
          window.removeEventListener('message', onMessage);
          window.clearTimeout(timer);
          iframe.remove();
          resolve({
            ...outcome,
            results,
            elapsedMs: Math.round(performance.now() - startedAt),
          });
        }

        function onMessage(event: MessageEvent) {
          const data = event.data as {
            type?: string;
            nonce?: string;
            requirements?: CaseOutcome['requirements'];
            errors?: string[];
          } | null;
          if (
            event.source !== iframe.contentWindow ||
            !data ||
            data.nonce !== nonce ||
            data.type !== 'diw:result'
          ) {
            return;
          }
          results += 1;
          finish({
            requirements: data.requirements ?? [],
            errors: data.errors ?? [],
          });
        }

        const timer = window.setTimeout(
          () => finish({ requirements: null, errors: [] }),
          capMs,
        );
        window.addEventListener('message', onMessage);
        document.body.appendChild(iframe);
        iframe.srcdoc = srcdoc;
      }),
    { srcdoc, nonce, sandbox: SANDBOX_FLAGS, capMs: CASE_CAP_MS },
  );
}

function failedIds(outcome: CaseOutcome): string[] {
  if (outcome.requirements === null) {
    return ['nenhum diw:result em 5000 ms'];
  }
  return outcome.requirements
    .filter((requirement) => !requirement.passed)
    .map((requirement) => requirement.id);
}

function click(selector: string): Requirement['before'] {
  return [{ do: 'click', selector }];
}

function exists(id: string, selector: string, before?: Requirement['before']): Requirement {
  return {
    id,
    label: id,
    check: { kind: 'exists', selector },
    ...(before ? { before } : {}),
  };
}

interface Probe {
  name: string;
  input: CaseInput;
}

const FORM = '<form id="f"><input name="q" value="x"><button id="go">Enviar</button></form>';

const SUBMIT_PROBES: Probe[] = [
  {
    name: 'submit-com-preventDefault',
    input: {
      files: {
        html: FORM,
        css: '',
        js: `document.getElementById('f').addEventListener('submit', function (e) {
  e.preventDefault();
  var done = document.createElement('p');
  done.id = 'feito';
  done.textContent = 'enviado';
  document.body.appendChild(done);
});`,
      },
      requirements: [exists('handler-rodou', '#feito', click('#go'))],
    },
  },
  {
    name: 'submit-sem-preventDefault',
    input: {
      files: {
        html: FORM,
        css: '',
        // O guard em captura já chamou preventDefault antes deste handler.
        js: `document.getElementById('f').addEventListener('submit', function (e) {
  var done = document.createElement('p');
  done.id = 'feito';
  done.className = String(e.defaultPrevented);
  document.body.appendChild(done);
});`,
      },
      requirements: [
        exists('handler-rodou', '#feito', click('#go')),
        exists('guard-cancelou', '#feito.true'),
      ],
    },
  },
  {
    name: 'form-submit',
    input: {
      files: {
        html: FORM,
        css: '',
        js: `document.getElementById('f').addEventListener('submit', function (e) {
  e.preventDefault();
  var done = document.createElement('p');
  done.id = 'feito';
  document.body.appendChild(done);
  document.getElementById('f').submit();
});`,
      },
      requirements: [exists('handler-rodou', '#feito', click('#go'))],
    },
  },
  {
    name: 'request-submit',
    input: {
      files: {
        html: FORM,
        css: '',
        js: `var n = 0;
document.getElementById('f').addEventListener('submit', function (e) {
  e.preventDefault();
  var done = document.createElement('p');
  done.id = 'feito';
  document.body.appendChild(done);
  if (n === 0) {
    n = 1;
    document.getElementById('f').requestSubmit();
  }
});`,
      },
      requirements: [exists('handler-rodou', '#feito', click('#go'))],
    },
  },
];

/** Cada tentativa de fuga só cria o seu marcador quando foi contida. */
const ISOLATION_JS = `
function mark(id) {
  var el = document.createElement('p');
  el.id = id;
  document.body.appendChild(el);
}
try { void parent.document.body; } catch (e) { mark('i-parent'); }
try { void localStorage.length; } catch (e) { mark('i-storage'); }
try { if (document.cookie === '') mark('i-cookie'); } catch (e) { mark('i-cookie'); }
try { top.location.href = 'http://127.0.0.1:1/top-escape'; } catch (e) {}
mark('i-top');
if (window.open('about:blank') === null) mark('i-open');
['_top', '_blank'].forEach(function (target) {
  var form = document.getElementById('alvo' + target);
  form.addEventListener('submit', function () { mark('i-form' + target); });
});
`;

const ISOLATION_PROBE: Probe = {
  name: 'isolamento',
  input: {
    files: {
      html:
        '<form id="alvo_top" target="_top" action="http://127.0.0.1:1/x"><button id="b1">a</button></form>' +
        '<form id="alvo_blank" target="_blank" action="http://127.0.0.1:1/y"><button id="b2">b</button></form>',
      css: '',
      js: ISOLATION_JS,
    },
    requirements: [
      exists('parent-document', '#i-parent'),
      exists('local-storage', '#i-storage'),
      exists('cookie', '#i-cookie'),
      exists('top-location', '#i-top'),
      exists('window-open', '#i-open'),
      exists('form-top', '#i-form_top', click('#b1')),
      exists('form-blank', '#i-form_blank', click('#b2')),
    ],
  },
};

/**
 * Sinais de ciclo de vida: mede, no pai, quanto tempo depois do início do
 * harness chega diw:unload ou um segundo diw:started (carimbos do pai).
 * Sem while(true) síncrono: congela o Chromium headless.
 */
interface LifecycleOutcome {
  startedCount: number;
  unloadCount: number;
  /** ms desde o primeiro diw:started até o primeiro sinal de navegação. */
  signalAfterMs: number | null;
  results: number;
  failed: string[];
}

async function runLifecycle(env: ProbeEnv, input: CaseInput): Promise<LifecycleOutcome> {
  const nonce = randomUUID();
  const config: SrcdocConfig = {
    nonce,
    mode: 'test',
    parentOrigin: env.origin,
    requirements: input.requirements,
  };
  const srcdoc = buildSrcdoc(input.files, config, HARNESS);
  return env.page.evaluate(
    ({ srcdoc, nonce, sandbox, windowMs }) =>
      new Promise<LifecycleOutcome>((resolve) => {
        const iframe = document.createElement('iframe');
        iframe.setAttribute('sandbox', sandbox);
        let firstStartedAt: number | null = null;
        const out: LifecycleOutcome = {
          startedCount: 0,
          unloadCount: 0,
          signalAfterMs: null,
          results: 0,
          failed: [],
        };
        function onMessage(event: MessageEvent) {
          const data = event.data as {
            type?: string;
            nonce?: string;
            requirements?: { id: string; passed: boolean }[];
          } | null;
          if (event.source !== iframe.contentWindow || !data || data.nonce !== nonce) {
            return;
          }
          const now = performance.now();
          if (data.type === 'diw:started') {
            out.startedCount += 1;
            if (firstStartedAt === null) {
              firstStartedAt = now;
            } else if (out.signalAfterMs === null) {
              out.signalAfterMs = Math.round(now - firstStartedAt);
            }
          } else if (data.type === 'diw:unload') {
            out.unloadCount += 1;
            if (out.signalAfterMs === null && firstStartedAt !== null) {
              out.signalAfterMs = Math.round(now - firstStartedAt);
            }
          } else if (data.type === 'diw:result') {
            out.results += 1;
            out.failed = (data.requirements ?? [])
              .filter((requirement) => !requirement.passed)
              .map((requirement) => requirement.id);
          }
        }
        window.addEventListener('message', onMessage);
        window.setTimeout(() => {
          window.removeEventListener('message', onMessage);
          iframe.remove();
          resolve(out);
        }, windowMs);
        document.body.appendChild(iframe);
        iframe.srcdoc = srcdoc;
      }),
    { srcdoc, nonce, sandbox: SANDBOX_FLAGS, windowMs: NAVIGATION_WINDOW_MS },
  );
}

const NAVIGATION_PROBES: { name: string; js: string }[] = [
  { name: 'reload', js: 'location.reload();' },
  { name: 'href-about-blank', js: "location.href = 'about:blank';" },
];

async function runNavigationProbe(
  env: ProbeEnv,
  name: string,
  js: string,
): Promise<string | null> {
  const outcome = await runLifecycle(env, {
    files: { html: '<p id="alvo">oi</p>', css: '', js },
    requirements: [exists('alvo-existe', '#alvo')],
  });
  if (outcome.signalAfterMs === null) {
    return `nenhum diw:unload nem segundo diw:started em ${NAVIGATION_WINDOW_MS} ms (${name})`;
  }
  if (outcome.signalAfterMs > NAVIGATION_LIMIT_MS) {
    return `sinal chegou após ${outcome.signalAfterMs} ms (limite ${NAVIGATION_LIMIT_MS} ms)`;
  }
  return null;
}

async function runHashProbe(env: ProbeEnv): Promise<string | null> {
  const outcome = await runLifecycle(env, {
    files: { html: '<p id="alvo">oi</p>', css: '', js: "location.hash = '#x';" },
    requirements: [exists('alvo-existe', '#alvo')],
  });
  if (outcome.unloadCount > 0 || outcome.startedCount !== 1) {
    return `hash gerou sinal de navegação (started=${outcome.startedCount}, unload=${outcome.unloadCount})`;
  }
  if (outcome.results !== 1 || outcome.failed.length > 0) {
    return `hash não foi corrigido normalmente (resultados=${outcome.results}, falhas=${outcome.failed.join(',')})`;
  }
  return null;
}

interface E2eOutcome {
  /** ms entre o clique (no pai) e o último requisito sair de "pendente". */
  elapsedMs: number;
  timedOut: boolean;
  items: { status: string; message: string }[];
  loopTextOnPage: boolean;
}

/**
 * Abre a página real do desafio no app construído com um rascunho salvo
 * (v2, onboarded), clica em "Executar testes" e mede, dentro da página, o
 * tempo entre o clique e todos os requisitos saírem de "pendente".
 */
async function runE2e(
  browser: Browser,
  origin: string,
  challenge: Challenge,
  code: CodeFiles,
): Promise<E2eOutcome> {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  try {
    const save = {
      schemaVersion: 2,
      createdAt: new Date().toISOString(),
      onboarded: true,
      xpTotal: 0,
      challenges: {
        [challenge.id]: {
          passed: false,
          failedRuns: 0,
          hintsUsed: 0,
          xpAwarded: 0,
          code,
        },
      },
    };
    // Roda também no iframe sandbox da prévia, onde localStorage lança erro.
    await context.addInitScript('window.__name = (target) => target;');
    await context.addInitScript(`if (window === window.top) { try {
      localStorage.setItem(${JSON.stringify(SAVE_KEY)}, ${JSON.stringify(JSON.stringify(save))});
    } catch {} }`);
    const page = await context.newPage();
    await page.goto(`${origin}/desafio/${challenge.id}`, { waitUntil: 'load' });
    await page
      .getByRole('button', { name: 'Executar testes' })
      .waitFor({ state: 'visible', timeout: 15_000 });
    await page.locator('.requirement-list__item').first().waitFor({ timeout: 15_000 });

    return await page.evaluate(
      ({ capMs }) =>
        new Promise<E2eOutcome>((resolve) => {
          const button = Array.from(document.querySelectorAll('button')).find(
            (candidate) => candidate.textContent?.trim() === 'Executar testes',
          );
          const read = () =>
            Array.from(document.querySelectorAll('.requirement-list__item')).map(
              (item) => ({
                status: /--(pending|passed|failed)\b/.exec(item.className)?.[1] ?? '',
                message:
                  item.querySelector('.requirement-list__message')?.textContent ?? '',
              }),
            );
          const startedAt = performance.now();
          let done = false;
          const finish = (timedOut: boolean) => {
            if (done) {
              return;
            }
            done = true;
            const elapsedMs = Math.round(performance.now() - startedAt);
            observer.disconnect();
            window.clearTimeout(timer);
            resolve({
              elapsedMs,
              timedOut,
              items: read(),
              loopTextOnPage: document.body.innerText.includes('Tempo esgotado (loop infinito?)'),
            });
          };
          const check = () => {
            const items = read();
            if (items.length > 0 && items.every((item) => item.status !== 'pending')) {
              finish(false);
            }
          };
          const observer = new MutationObserver(check);
          observer.observe(document.body, {
            subtree: true,
            childList: true,
            attributes: true,
            characterData: true,
          });
          const timer = window.setTimeout(() => finish(true), capMs);
          if (!button) {
            finish(true);
            return;
          }
          button.click();
        }),
      { capMs: E2E_CAP_MS },
    );
  } finally {
    await context.close();
  }
}

async function e2eSolution(browser: Browser, origin: string, challenge: Challenge): Promise<string | null> {
  const outcome = await runE2e(browser, origin, challenge, challenge.solution);
  if (outcome.timedOut) {
    return `sem resultado em ${E2E_CAP_MS} ms`;
  }
  const bad = outcome.items
    .map((item, index) => ({ ...item, id: challenge.requirements[index]?.id ?? String(index) }))
    .filter((item) => item.status !== 'passed');
  if (outcome.items.length !== challenge.requirements.length || bad.length > 0) {
    return `${outcome.items.length} requisitos; não passaram: ${bad.map((item) => `${item.id} (${item.status}: ${item.message})`).join(', ')}`;
  }
  return null;
}

async function e2eReload(
  browser: Browser,
  origin: string,
  challenge: Challenge,
): Promise<{ problem: string | null; elapsedMs: number }> {
  const outcome = await runE2e(browser, origin, challenge, {
    ...challenge.starter,
    js: 'location.reload();',
  });
  const elapsedMs = outcome.elapsedMs;
  if (outcome.loopTextOnPage) {
    return { problem: `"${LOOP_MESSAGE}" apareceu na página (${elapsedMs} ms)`, elapsedMs };
  }
  if (outcome.timedOut) {
    return { problem: `sem resultado em ${E2E_CAP_MS} ms`, elapsedMs };
  }
  if (elapsedMs > NAVIGATION_LIMIT_MS) {
    return { problem: `resultado após ${elapsedMs} ms (limite ${NAVIGATION_LIMIT_MS} ms)`, elapsedMs };
  }
  if (outcome.items.length !== challenge.requirements.length) {
    return { problem: `${outcome.items.length} requisitos na página (esperado ${challenge.requirements.length})`, elapsedMs };
  }
  const wrong = outcome.items.filter((item) => item.message !== NAVIGATION_MESSAGE);
  if (wrong.length > 0) {
    return {
      problem: `mensagem inesperada em ${wrong.length} requisito(s): ${JSON.stringify(wrong[0])}`,
      elapsedMs,
    };
  }
  return { problem: null, elapsedMs };
}

async function pause(ms: number): Promise<void> {
  await new Promise((resolveTimer) => setTimeout(resolveTimer, ms));
}

async function runSimpleProbe(env: ProbeEnv, probe: Probe): Promise<string | null> {
  const outcome = await runCase(env, probe.input);
  const failed = failedIds(outcome);
  if (failed.length > 0) {
    return `requisitos falharam: ${failed.join(', ')}`;
  }
  if (outcome.results !== 1) {
    return `${outcome.results} mensagens diw:result (esperado 1)`;
  }
  return null;
}

async function runIsolation(env: ProbeEnv, popups: string[]): Promise<string | null> {
  const before = env.page.url();
  const problem = await runSimpleProbe(env, ISOLATION_PROBE);
  await pause(SETTLE_MS);
  if (problem !== null) {
    return problem;
  }
  if (env.page.url() !== before) {
    return `o pai navegou de ${before} para ${env.page.url()}`;
  }
  if (popups.length > 0) {
    return `abriu página(s): ${popups.join(', ')}`;
  }
  return null;
}

export async function runRunnerProbe(
  browser: Browser,
  origin: string,
): Promise<number> {
  const startedAt = Date.now();
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const failures: string[] = [];
  const popups: string[] = [];

  function record(name: string, problem: string | null, okLine: string): void {
    if (problem === null) {
      console.log(okLine);
    } else {
      failures.push(`runner: FALHOU ${name}: ${problem}`);
    }
  }

  try {
    // tsx (esbuild keepNames) injeta `__name(...)` nas funções serializadas
    // para o evaluate; a página não o define.
    await context.addInitScript('window.__name = (target) => target;');
    const page = await context.newPage();
    context.on('page', (popup) => {
      popups.push(popup.url());
    });
    await page.goto(`${origin}/runner-probe.html`, { waitUntil: 'load' });
    const env: ProbeEnv = { page, context, origin };

    for (const probe of SUBMIT_PROBES) {
      record(
        probe.name,
        await runSimpleProbe(env, probe),
        `runner: sonda ${probe.name} OK`,
      );
    }
    record(
      ISOLATION_PROBE.name,
      await runIsolation(env, popups),
      'runner: sonda isolamento OK',
    );

    for (const probe of NAVIGATION_PROBES) {
      record(
        probe.name,
        await runNavigationProbe(env, probe.name, probe.js),
        `runner: sonda ${probe.name} OK`,
      );
    }
    record('hash', await runHashProbe(env), 'runner: sonda hash OK');

    const challenges = loadChallenges();
    let passed = 0;
    for (const challenge of challenges) {
      const outcome = await runCase(env, {
        files: challenge.solution,
        requirements: challenge.requirements,
        mocks: challenge.mocks,
        libs: challenge.libs,
      });
      const failed = failedIds(outcome);
      if (failed.length === 0) {
        passed += 1;
      } else {
        failures.push(
          `runner: FALHOU ${challenge.id}: solução de referência falhou em ${failed.join(', ')}`,
        );
      }
    }
    if (passed === challenges.length) {
      console.log(
        `runner: ${passed}/${challenges.length} soluções de referência passam no Chromium`,
      );
    }

    const e2eChallenge = challenges.find((challenge) => challenge.id === E2E_ID);
    if (e2eChallenge === undefined) {
      failures.push(`runner: FALHOU e2e ${E2E_ID}: desafio ausente`);
    } else {
      record(
        `e2e ${E2E_ID} solução`,
        await e2eSolution(browser, origin, e2eChallenge),
        `runner: e2e ${E2E_ID} solução OK`,
      );
      const reload = await e2eReload(browser, origin, e2eChallenge);
      record(
        `e2e ${E2E_ID} reload`,
        reload.problem,
        `runner: e2e ${E2E_ID} reload OK`,
      );
      console.log(`runner: e2e ${E2E_ID} reload medido em ${reload.elapsedMs} ms`);
    }

    const starter = challenges.find((challenge) => challenge.id === 'n20-c02');
    if (starter === undefined) {
      failures.push('runner: FALHOU starter-n20-c02-falha: desafio n20-c02 ausente');
    } else {
      const outcome = await runCase(env, {
        files: starter.starter,
        requirements: starter.requirements,
        mocks: starter.mocks,
        libs: starter.libs,
      });
      record(
        'starter-n20-c02-falha',
        outcome.requirements !== null && failedIds(outcome).length > 0
          ? null
          : 'o starter deveria falhar em algum requisito',
        'runner: sonda starter-n20-c02-falha OK',
      );
    }
  } finally {
    await context.close();
  }

  if (failures.length > 0) {
    console.error(failures.join('\n'));
    return 1;
  }
  console.log(`runner: OK em ${((Date.now() - startedAt) / 1000).toFixed(1)} s`);
  return 0;
}
