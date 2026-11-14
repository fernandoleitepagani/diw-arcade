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
import { NAVIGATION_MESSAGE, TIMEOUT_MESSAGE } from '../../src/features/runner/messages';
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
/** Latência da navegação relativa `slow.html`: o diw:survived (30 ms) sai antes de a resposta chegar. */
const SLOW_NAVIGATION_DELAY_MS = 150;
/** Navegação lenta termina pelo timer total (3 s) do runner; margem para máquina carregada. */
const SLOW_NAVIGATION_LIMIT_MS = 5000;
/** Folga além do teto interno de cada evaluate: depois dela o evaluate pendurado vira falha. */
const EVALUATE_GRACE_MS = 4000;
const CLOSE_CAP_MS = 10_000;
const SAVE_KEY = 'diw-arcade:save';
const E2E_ID = 'n20-c02';
/** Teto de espera pelos resultados na página real (o timeout do runner é maior que o limite). */
const E2E_CAP_MS = 12_000;
/**
 * Clique do aluno que segue um mailto: na página real do app a correção deve
 * continuar. Quem prova o diw:survived isoladamente é a sonda mailto-click
 * (o e2e passa também sem ele quando os requisitos terminam dentro da
 * tolerância do diw:unload).
 */
const MAILTO_JS = `
document.querySelector('#cadastrar').addEventListener('click', function () {
  location.href = 'mailto:aluno@example.com';
});`;

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

/**
 * Um evaluate numa página que o código do aluno fez navegar (chrome-error://)
 * nunca retorna; o tempo limite o transforma em falha em vez de travar o gate.
 */
async function withTimeout<T>(work: Promise<T>, ms: number, what: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const limit = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${what} sem resposta em ${ms} ms (página travada ou navegou?)`)),
      ms,
    );
  });
  try {
    return await Promise.race([work, limit]);
  } finally {
    clearTimeout(timer);
  }
}

/** Falha que invalida o resto da sonda (a página-pai não é mais confiável). */
class ProbeAbort extends Error {}

function loadChallenges(): Challenge[] {
  const contentDir = join(ROOT, 'src/content');
  const challenges: Challenge[] = [];
  for (const entry of readdirSync(contentDir).sort()) {
    if (!/^n\d{2}$/.test(entry)) {
      continue;
    }
    // Sem challenges.json o nível ficaria fora da prova em silêncio: falha.
    const raw = readFileSync(join(contentDir, entry, 'challenges.json'), 'utf8');
    const level = z.array(ChallengeSchema).parse(JSON.parse(raw));
    if (level.length === 0) {
      throw new Error(`${entry}/challenges.json não tem desafios`);
    }
    challenges.push(...level);
  }
  if (challenges.length === 0) {
    throw new Error('nenhum desafio encontrado em src/content');
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

  return withTimeout(env.page.evaluate(
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
  ), CASE_CAP_MS + EVALUATE_GRACE_MS, 'runCase');
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
  survivedCount: number;
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
  return withTimeout(env.page.evaluate(
    ({ srcdoc, nonce, sandbox, windowMs }) =>
      new Promise<LifecycleOutcome>((resolve) => {
        const iframe = document.createElement('iframe');
        iframe.setAttribute('sandbox', sandbox);
        let firstStartedAt: number | null = null;
        const out: LifecycleOutcome = {
          startedCount: 0,
          unloadCount: 0,
          survivedCount: 0,
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
          } else if (data.type === 'diw:survived') {
            out.survivedCount += 1;
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
  ), NAVIGATION_WINDOW_MS + EVALUATE_GRACE_MS, 'runLifecycle');
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
  if (outcome.survivedCount > 0) {
    return `diw:survived após navegação real (${name}): o pai perderia o sinal`;
  }
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

/**
 * Navegação relativa cuja resposta demora (`location.href = 'slow.html'`): o
 * diw:survived sai enquanto o pedido está em voo e o frame só é trocado depois.
 * Aqui só se prova o cenário (diw:unload, nenhum resultado, harness único); o
 * veredito NAVEGAÇÃO do pai é provado no e2e e nos testes unitários do runner.
 */
async function runSlowNavigationProbe(
  env: ProbeEnv,
): Promise<{ problem: string | null; note: string }> {
  const outcome = await runLifecycle(env, {
    files: { html: '<p id="alvo">oi</p>', css: '', js: "location.href = 'slow.html';" },
    requirements: [exists('alvo-existe', '#alvo')],
  });
  const note = `started=${outcome.startedCount}, unload=${outcome.unloadCount}, survived=${outcome.survivedCount}, resultados=${outcome.results}`;
  if (outcome.unloadCount < 1) {
    return { problem: `nenhum diw:unload na navegação lenta (${note})`, note };
  }
  if (outcome.results > 0 || outcome.startedCount !== 1) {
    return { problem: `a navegação lenta não interrompeu a correção (${note})`, note };
  }
  return { problem: null, note };
}

/**
 * `beforeunload` também dispara para navegações que não descarregam a página
 * (mailto:, tel:). O sinal de descarregamento é provisório: o harness avisa
 * com diw:survived e a correção segue normalmente, sem NAVEGAÇÃO.
 */
const SURVIVING_PROBES: { name: string; html: string; js: string; click: string }[] = [
  {
    name: 'mailto-click',
    html: '<button id="go">Enviar</button>',
    js: `document.getElementById('go').addEventListener('click', function () {
  var done = document.createElement('p');
  done.id = 'feito';
  document.body.appendChild(done);
  location.href = 'mailto:aluno@example.com';
});`,
    click: '#go',
  },
  {
    name: 'tel-link',
    html: '<a id="ligar" href="tel:+5531999990000">Ligar</a>',
    js: `document.getElementById('ligar').addEventListener('click', function () {
  var done = document.createElement('p');
  done.id = 'feito';
  document.body.appendChild(done);
});`,
    click: '#ligar',
  },
];

async function runSurvivingProbe(
  env: ProbeEnv,
  probe: (typeof SURVIVING_PROBES)[number],
): Promise<string | null> {
  const outcome = await runLifecycle(env, {
    files: { html: probe.html, css: '', js: probe.js },
    requirements: [exists('handler-rodou', '#feito', click(probe.click))],
  });
  if (outcome.startedCount !== 1) {
    return `o frame reiniciou (started=${outcome.startedCount})`;
  }
  if (outcome.survivedCount < outcome.unloadCount) {
    return `diw:unload sem diw:survived (unload=${outcome.unloadCount}, survived=${outcome.survivedCount}): a página seria reprovada como NAVEGAÇÃO`;
  }
  if (outcome.results !== 1 || outcome.failed.length > 0) {
    return `não foi corrigido normalmente (resultados=${outcome.results}, falhas=${outcome.failed.join(',')})`;
  }
  return null;
}

/** Formulário dentro de shadow root: `submit` não é composed e escapa do guard na janela. */
const SHADOW_PROBES = (['open', 'closed'] as const).map((mode) => ({
  name: `shadow-${mode}`,
  html: '<div id="host"></div>',
  js: `var root = document.getElementById('host').attachShadow({ mode: '${mode}' });
root.innerHTML = '<form id="f"><input name="q"><button id="go">Enviar</button></form>';
var btn = root.getElementById('go');
root.getElementById('f').addEventListener('submit', function () {
  var done = document.createElement('p');
  done.id = 'feito';
  document.body.appendChild(done);
});
document.getElementById('host').addEventListener('click', function () { btn.click(); });`,
}));

async function runShadowProbe(
  env: ProbeEnv,
  probe: (typeof SHADOW_PROBES)[number],
): Promise<string | null> {
  const outcome = await runLifecycle(env, {
    files: { html: probe.html, css: '', js: probe.js },
    requirements: [exists('handler-rodou', '#feito', click('#host'))],
  });
  if (outcome.startedCount !== 1 || outcome.unloadCount > 0) {
    return `o submit recarregou o frame (started=${outcome.startedCount}, unload=${outcome.unloadCount})`;
  }
  if (outcome.results !== 1 || outcome.failed.length > 0) {
    return `não foi corrigido normalmente (resultados=${outcome.results}, falhas=${outcome.failed.join(',')})`;
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
  slowNavigation = false,
): Promise<E2eOutcome> {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  try {
    if (slowNavigation) {
      await routeSlowNavigation(context);
    }
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

    return await withTimeout(page.evaluate(
      ({ capMs, timeoutText }) =>
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
              loopTextOnPage: document.body.innerText.includes(timeoutText),
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
      { capMs: E2E_CAP_MS, timeoutText: TIMEOUT_MESSAGE },
    ), E2E_CAP_MS + EVALUATE_GRACE_MS, 'e2e');
  } finally {
    await withTimeout(context.close(), CLOSE_CAP_MS, 'context.close').catch(() => undefined);
  }
}

async function e2eSolution(
  browser: Browser,
  origin: string,
  challenge: Challenge,
  extraJs = '',
): Promise<string | null> {
  const outcome = await runE2e(browser, origin, challenge, {
    ...challenge.solution,
    js: challenge.solution.js + extraJs,
  });
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
  js = 'location.reload();',
  { limitMs = NAVIGATION_LIMIT_MS, slow = false } = {},
): Promise<{ problem: string | null; elapsedMs: number }> {
  const outcome = await runE2e(
    browser,
    origin,
    challenge,
    { ...challenge.starter, js },
    slow,
  );
  const elapsedMs = outcome.elapsedMs;
  if (outcome.loopTextOnPage) {
    return { problem: `"${TIMEOUT_MESSAGE}" apareceu na página (${elapsedMs} ms)`, elapsedMs };
  }
  if (outcome.timedOut) {
    return { problem: `sem resultado em ${E2E_CAP_MS} ms`, elapsedMs };
  }
  if (elapsedMs > limitMs) {
    return { problem: `resultado após ${elapsedMs} ms (limite ${limitMs} ms)`, elapsedMs };
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

/** `slow.html` responde uma página trivial após uma latência fixa (o servidor da sonda cairia no index). */
async function routeSlowNavigation(context: BrowserContext): Promise<void> {
  await context.route('**/slow.html', async (route) => {
    await pause(SLOW_NAVIGATION_DELAY_MS);
    await route
      .fulfill({
        status: 200,
        contentType: 'text/html; charset=utf-8',
        body: '<!doctype html><title>lenta</title><p>lenta</p>',
      })
      .catch(() => undefined);
  });
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

/**
 * `top.location.href = ...` não lança no sandbox (só registra erro no
 * console), então nenhum marcador dentro do iframe prova a contenção. A prova
 * é no pai: uma variável de janela criada antes sobrevive (uma navegação a
 * destruiria) e nenhuma navegação do frame principal aconteceu.
 */
async function runIsolation(env: ProbeEnv, popups: string[]): Promise<string | null> {
  const before = env.page.url();
  await withTimeout(
    env.page.evaluate(() => {
      (window as unknown as { __runnerProbeAlive: boolean }).__runnerProbeAlive = true;
    }),
    EVALUATE_GRACE_MS,
    'isolamento (marcador)',
  );
  const mainFrame = env.page.mainFrame();
  let navigations = 0;
  const onNavigated = (frame: unknown) => {
    if (frame === mainFrame) {
      navigations += 1;
    }
  };
  env.page.on('framenavigated', onNavigated);
  // Uma navegação do pai destrói o contexto do evaluate: também é falha.
  const problem = await runSimpleProbe(env, ISOLATION_PROBE).catch(
    (error: unknown) => `o pai navegou durante a sonda (${String(error).split('\n')[0]})`,
  );
  await pause(SETTLE_MS).catch(() => undefined);
  env.page.off('framenavigated', onNavigated);
  if (problem !== null) {
    return problem;
  }
  const alive = await withTimeout(
    env.page.evaluate(
      () => (window as unknown as { __runnerProbeAlive?: boolean }).__runnerProbeAlive === true,
    ),
    EVALUATE_GRACE_MS,
    'isolamento (verificação)',
  ).catch(() => false);
  if (navigations > 0 || !alive) {
    return `o pai navegou (${navigations} navegação(ões), marcador ${alive ? 'presente' : 'perdido'})`;
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

  /** A falha sai na hora (um travamento posterior não pode escondê-la); `fatal` aborta a sonda. */
  function record(
    name: string,
    problem: string | null,
    okLine: string,
    fatal = false,
  ): void {
    if (problem === null) {
      console.log(okLine);
      return;
    }
    const line = `runner: FALHOU ${name}: ${problem}`;
    console.error(line);
    failures.push(line);
    if (fatal) {
      throw new ProbeAbort(line);
    }
  }

  try {
    // tsx (esbuild keepNames) injeta `__name(...)` nas funções serializadas
    // para o evaluate; a página não o define.
    await context.addInitScript('window.__name = (target) => target;');
    await routeSlowNavigation(context);
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
      true,
    );

    for (const probe of NAVIGATION_PROBES) {
      record(
        probe.name,
        await runNavigationProbe(env, probe.name, probe.js),
        `runner: sonda ${probe.name} OK`,
      );
    }
    record('hash', await runHashProbe(env), 'runner: sonda hash OK');
    const slow = await runSlowNavigationProbe(env);
    record('navegacao-lenta', slow.problem, 'runner: sonda navegacao-lenta OK');
    console.log(`runner: navegacao-lenta sinais ${slow.note}`);
    for (const probe of SURVIVING_PROBES) {
      record(
        probe.name,
        await runSurvivingProbe(env, probe),
        `runner: sonda ${probe.name} OK`,
      );
    }
    for (const probe of SHADOW_PROBES) {
      record(
        probe.name,
        await runShadowProbe(env, probe),
        `runner: sonda ${probe.name} OK`,
      );
    }

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
        record(
          challenge.id,
          `solução de referência falhou em ${failed.join(', ')}`,
          '',
        );
      }
    }
    if (passed !== challenges.length || challenges.length === 0) {
      record(
        'soluções de referência',
        `${passed} de ${challenges.length} desafios passaram`,
        '',
      );
    } else {
      console.log(
        `runner: ${passed}/${challenges.length} soluções de referência passam no Chromium`,
      );
    }

    const e2eChallenge = challenges.find((challenge) => challenge.id === E2E_ID);
    if (e2eChallenge === undefined) {
      record(`e2e ${E2E_ID}`, 'desafio ausente', '');
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
      const blank = await e2eReload(
        browser,
        origin,
        e2eChallenge,
        "location.href = 'about:blank';",
      );
      record(
        `e2e ${E2E_ID} about:blank`,
        blank.problem,
        `runner: e2e ${E2E_ID} about:blank OK`,
      );
      console.log(`runner: e2e ${E2E_ID} about:blank medido em ${blank.elapsedMs} ms`);
      const lenta = await e2eReload(
        browser,
        origin,
        e2eChallenge,
        "location.href = 'slow.html';",
        { limitMs: SLOW_NAVIGATION_LIMIT_MS, slow: true },
      );
      record(
        `e2e ${E2E_ID} navegacao lenta`,
        lenta.problem,
        `runner: e2e ${E2E_ID} navegacao lenta OK`,
      );
      console.log(`runner: e2e ${E2E_ID} navegacao lenta medido em ${lenta.elapsedMs} ms`);
      const mailto = await e2eSolution(
        browser,
        origin,
        e2eChallenge,
        MAILTO_JS,
      );
      record(
        `e2e ${E2E_ID} mailto`,
        mailto,
        `runner: e2e ${E2E_ID} solução com mailto OK`,
      );
    }

    const starter = challenges.find((challenge) => challenge.id === 'n20-c02');
    if (starter === undefined) {
      record('starter-n20-c02-falha', 'desafio n20-c02 ausente', '');
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
  } catch (error) {
    if (!(error instanceof ProbeAbort)) {
      const line = `runner: FALHOU sonda abortada: ${error instanceof Error ? error.message : String(error)}`;
      console.error(line);
      failures.push(line);
    }
  } finally {
    await withTimeout(context.close(), CLOSE_CAP_MS, 'context.close').catch(() => undefined);
  }

  if (failures.length > 0) {
    console.error(`runner: ${failures.length} falha(s); veja as linhas FALHOU acima`);
    return 1;
  }
  console.log(`runner: OK em ${((Date.now() - startedAt) / 1000).toFixed(1)} s`);
  return 0;
}
