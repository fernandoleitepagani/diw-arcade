import { readFileSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { chromium, type Browser, type LaunchOptions, type Page } from 'playwright';
import {
  checkRoutePage,
  SMOKE_ROUTES,
  VIEWPORTS,
  type Finding,
  type ProbeKind,
  type RoutePage,
  type RouteCheckResult,
  type SmokeRoute,
  type SmokeViolation,
  type Viewport,
} from './lib/smoke-routes';

const DIST = fileURLToPath(new URL('../dist', import.meta.url));
const BLANK_FIXTURE = fileURLToPath(
  new URL('./smoke-fixtures/blank', import.meta.url),
);
const BASELINE = JSON.parse(
  readFileSync(new URL('./smoke-baseline.json', import.meta.url), 'utf8'),
) as SmokeViolation[];

const SAVE_KEY = 'diw-arcade:save';
const ROOT_WAIT_MS = 5000;
/** Rotas lazy: o chunk do `main h1` pode demorar sob carga. */
const HEADING_WAIT_MS = 15_000;
const PROBE_WAIT_MS = 10_000;

/**
 * Fixture inline do selftest: o mesmo mutante do achado de review
 * (`main h1{min-width:4000px}`) que antes passava pelo smoke.
 */
const OVERFLOW_FIXTURE = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Página com overflow</title>
    <style>main h1 { min-width: 4000px; }</style>
  </head>
  <body>
    <div id="root">
      <main>
        <h1>Overflow de teste</h1>
      </main>
    </div>
  </body>
</html>`;

const MIME_TYPES: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
};

interface StaticServer {
  url: string;
  close(): Promise<void>;
}

function serve(
  rootDir: string,
  inlinePages: Readonly<Record<string, string>> = {},
): Promise<StaticServer> {
  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    let pathname: string;
    try {
      pathname = decodeURIComponent(url.pathname);
    } catch {
      response.writeHead(400);
      response.end('bad request');
      return;
    }

    const inlineBody = inlinePages[pathname];
    if (inlineBody !== undefined) {
      response.writeHead(200, { 'content-type': MIME_TYPES['.html'] });
      response.end(inlineBody);
      return;
    }

    const filePath = resolve(rootDir, `.${pathname}`);
    if (filePath !== rootDir && !filePath.startsWith(`${rootDir}${sep}`)) {
      response.writeHead(404);
      response.end('not found');
      return;
    }

    try {
      const info = await stat(filePath);
      const target = info.isDirectory() ? resolve(filePath, 'index.html') : filePath;
      const body = await readFile(target);
      response.writeHead(200, {
        'content-type': MIME_TYPES[extname(target)] ?? 'application/octet-stream',
      });
      response.end(body);
      return;
    } catch {
      // SPA: rotas sem extensão caem no index; asset ausente é 404 de verdade.
      if (extname(pathname) !== '') {
        response.writeHead(404);
        response.end('not found');
        return;
      }
    }

    try {
      const body = await readFile(resolve(rootDir, 'index.html'));
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      response.end(body);
    } catch {
      response.writeHead(500);
      response.end('index.html ausente');
    }
  });

  return new Promise((resolveServer, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address() as AddressInfo;
      resolveServer({
        url: `http://127.0.0.1:${address.port}`,
        close: () =>
          new Promise((resolveClose) => {
            server.close(() => resolveClose());
          }),
      });
    });
  });
}

function launchOptions(): LaunchOptions {
  const executablePath = process.env.SMOKE_CHROMIUM_PATH;
  return { headless: true, ...(executablePath ? { executablePath } : {}) };
}

async function startBrowser(): Promise<Browser> {
  try {
    return await chromium.launch(launchOptions());
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `não foi possível iniciar o Chromium. Instale o navegador ou defina SMOKE_CHROMIUM_PATH.\n${detail}`,
    );
  }
}

/** Sem filhos com texto, o bundle não renderizou: o root está em branco. */
async function isRootBlank(page: Page): Promise<boolean> {
  try {
    await page.waitForFunction(
      () => {
        const root = document.querySelector('#root');
        if (!root) {
          return false;
        }
        return (
          root.childElementCount > 0 &&
          (root.textContent ?? '').trim().length > 0
        );
      },
      undefined,
      { timeout: ROOT_WAIT_MS },
    );
    return false;
  } catch {
    return true;
  }
}

/** O esqueleto de carregamento não tem h1; a rota só conta depois que ele aparece. */
async function waitForHeading(page: Page): Promise<boolean> {
  try {
    await page.waitForSelector('main h1', {
      state: 'attached',
      timeout: HEADING_WAIT_MS,
    });
    return true;
  } catch {
    return false;
  }
}

function errorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.split('\n')[0] ?? message;
}

/**
 * Interage com a pergunta atual do quiz e exige o feedback. A rodada sorteia
 * perguntas de múltipla escolha, verdadeiro/falso e preenchimento; as duas
 * primeiras têm opções e a última precisa de texto, mas todas levam ao mesmo
 * painel de feedback.
 */
async function probeQuiz(page: Page): Promise<string | null> {
  try {
    const option = page.locator('input[name="quiz-option"]').first();
    if ((await option.count()) > 0) {
      await option.check({ timeout: PROBE_WAIT_MS });
    } else {
      await page
        .locator('.quiz-round__fill input[type="text"]')
        .fill('resposta do smoke', { timeout: PROBE_WAIT_MS });
    }

    await page
      .getByRole('button', { name: 'Responder' })
      .click({ timeout: PROBE_WAIT_MS });
    await page
      .locator('.quiz-round__feedback')
      .waitFor({ state: 'visible', timeout: PROBE_WAIT_MS });
    return null;
  } catch (error) {
    return `quiz não mostrou feedback após responder: ${errorMessage(error)}`;
  }
}

/** Revela a carta atual e exige a resposta no verso. */
async function probeFlashcard(page: Page): Promise<string | null> {
  try {
    await page
      .locator('.flashcard-session__reveal')
      .click({ timeout: PROBE_WAIT_MS });
    await page
      .locator('.flashcard-session__back')
      .waitFor({ state: 'visible', timeout: PROBE_WAIT_MS });
    return null;
  } catch (error) {
    return `carta não revelou a resposta: ${errorMessage(error)}`;
  }
}

function probeInteraction(page: Page, kind: ProbeKind): Promise<string | null> {
  return kind === 'quiz' ? probeQuiz(page) : probeFlashcard(page);
}

/**
 * Liga os ouvintes antes da navegação e expõe a página para a checagem
 * compartilhada. Os erros ficam acumulando até `collectErrors`, já no fim.
 */
function watchPage(page: Page, origin: string): RoutePage {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const httpErrors: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => {
    pageErrors.push(error.message);
  });
  page.on('response', (response) => {
    const url = new URL(response.url());
    if (url.origin !== origin || response.status() < 400) {
      return;
    }
    httpErrors.push(
      `${response.status()} ${response.request().method()} ${url.pathname}`,
    );
  });

  return {
    isRootBlank: () => isRootBlank(page),
    waitForHeading: () => waitForHeading(page),
    measureOverflow: () =>
      page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      })),
    runAxe: async () => {
      const axe = await new AxeBuilder({ page }).analyze();
      return axe.violations.map((violation) => ({
        id: violation.id,
        impact: violation.impact ?? null,
        help: violation.help,
        nodes: violation.nodes.length,
      }));
    },
    probeInteraction: (kind) => probeInteraction(page, kind),
    collectErrors: async () => {
      const findings: Finding[] = [];
      for (const detail of consoleErrors) {
        findings.push({ kind: 'console', detail });
      }
      for (const detail of pageErrors) {
        findings.push({ kind: 'pageerror', detail });
      }
      for (const detail of httpErrors) {
        findings.push({ kind: 'http', detail });
      }
      return findings;
    },
  };
}

function seedScript(route: SmokeRoute): string {
  const action =
    route.seed === 'fresh'
      ? `localStorage.removeItem(${JSON.stringify(SAVE_KEY)});`
      : `localStorage.setItem(${JSON.stringify(SAVE_KEY)}, ${JSON.stringify(
          JSON.stringify({
            schemaVersion: 1,
            createdAt: new Date().toISOString(),
            onboarded: true,
            xpTotal: 0,
          }),
        )});`;

  // O addInitScript também roda no iframe sandbox da prévia de /desafio, onde
  // localStorage lança SecurityError por causa da origem opaca.
  return `if (window === window.top) {
  try {
    ${action}
  } catch {
    // localStorage indisponível: a rota decide o estado inicial.
  }
}`;
}

async function checkRoute(
  browser: Browser,
  baseUrl: string,
  route: SmokeRoute,
  viewport: Viewport,
): Promise<RouteCheckResult> {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    reducedMotion: 'reduce',
  });

  try {
    const page = await context.newPage();
    const routePage = watchPage(page, new URL(baseUrl).origin);

    await context.addInitScript(seedScript(route));
    await page.goto(`${baseUrl}${route.path}`, { waitUntil: 'load' });

    return await checkRoutePage(route, routePage, BASELINE);
  } finally {
    await context.close();
  }
}

async function runSmoke(): Promise<number> {
  try {
    await stat(resolve(DIST, 'index.html'));
  } catch {
    console.error('smoke: dist/index.html ausente; rode npm run build antes.');
    return 1;
  }

  const server = await serve(DIST);
  let browser: Browser | undefined;

  try {
    browser = await startBrowser();
    const failures: string[] = [];
    let baselined = 0;

    for (const route of SMOKE_ROUTES) {
      for (const viewport of VIEWPORTS) {
        const result = await checkRoute(browser, server.url, route, viewport);
        baselined += result.baselined;

        if (result.failures.length > 0) {
          failures.push(
            `smoke: ${route.path} @ ${viewport.width}px (${route.label})`,
          );
          for (const finding of result.failures) {
            failures.push(`  - ${finding.kind}: ${finding.detail}`);
          }
        }
      }
    }

    if (failures.length > 0) {
      console.error(failures.join('\n'));
      console.error(
        `smoke: ${SMOKE_ROUTES.length} rotas x ${VIEWPORTS.length} larguras — falhas acima`,
      );
      return 1;
    }

    console.log(
      `smoke: ${SMOKE_ROUTES.length} rotas x ${VIEWPORTS.length} larguras OK`,
    );
    if (baselined > 0) {
      console.log(`smoke: ${baselined} violação(ões) conhecida(s) na baseline`);
    }
    return 0;
  } finally {
    await browser?.close();
    await server.close();
  }
}

async function runSelftest(): Promise<number> {
  try {
    await stat(resolve(BLANK_FIXTURE, 'index.html'));
  } catch {
    console.error('selftest: fixture em branco ausente.');
    return 1;
  }

  const server = await serve(BLANK_FIXTURE, {
    '/overflow.html': OVERFLOW_FIXTURE,
  });
  let browser: Browser | undefined;

  try {
    browser = await startBrowser();
    const context = await browser.newContext({
      viewport: { width: VIEWPORTS[0].width, height: VIEWPORTS[0].height },
      reducedMotion: 'reduce',
    });

    try {
      const failures: string[] = [];

      const blankPage = await context.newPage();
      const blankHarness = watchPage(blankPage, server.url);
      await blankPage.goto(`${server.url}/`, { waitUntil: 'load' });
      const blank = await checkRoutePage(
        { path: '/', label: 'em branco' },
        blankHarness,
        [],
      );
      if (blank.failures.some((finding) => finding.kind === 'root-vazio')) {
        console.log('selftest OK: bundle em branco detectado');
      } else {
        failures.push('selftest FALHOU: bundle em branco não foi detectado');
      }

      const overflowPage = await context.newPage();
      const overflowHarness = watchPage(overflowPage, server.url);
      await overflowPage.goto(`${server.url}/overflow.html`, {
        waitUntil: 'load',
      });
      const overflow = await checkRoutePage(
        { path: '/overflow.html', label: 'overflow' },
        overflowHarness,
        [],
      );
      const overflowFinding = overflow.failures.find(
        (finding) => finding.kind === 'overflow',
      );
      if (overflowFinding !== undefined) {
        console.log(`selftest OK: overflow detectado (${overflowFinding.detail})`);
      } else {
        failures.push('selftest FALHOU: overflow não foi detectado');
      }

      if (failures.length > 0) {
        console.error(failures.join('\n'));
        return 1;
      }
      return 0;
    } finally {
      await context.close();
    }
  } finally {
    await browser?.close();
    await server.close();
  }
}

async function main(): Promise<void> {
  const selftest = process.argv.includes('--selftest');
  process.exitCode = selftest ? await runSelftest() : await runSmoke();
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
