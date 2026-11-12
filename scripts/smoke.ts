import { readFileSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { chromium, type Browser, type LaunchOptions, type Page } from 'playwright';
import {
  isBaselined,
  SMOKE_ROUTES,
  VIEWPORTS,
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

interface Finding {
  kind: 'root-vazio' | 'console' | 'pageerror' | 'http' | 'overflow' | 'axe';
  detail: string;
}

interface RouteResult {
  failures: Finding[];
  baselined: number;
}

function serve(rootDir: string): Promise<StaticServer> {
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

function seedScript(route: SmokeRoute): string {
  if (route.seed === 'fresh') {
    return `localStorage.removeItem(${JSON.stringify(SAVE_KEY)});`;
  }
  const save = {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    onboarded: true,
    xpTotal: 0,
  };
  return `localStorage.setItem(${JSON.stringify(SAVE_KEY)}, ${JSON.stringify(
    JSON.stringify(save),
  )});`;
}

async function checkRoute(
  browser: Browser,
  baseUrl: string,
  route: SmokeRoute,
  viewport: Viewport,
): Promise<RouteResult> {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    reducedMotion: 'reduce',
  });

  try {
    const page = await context.newPage();
    const failures: Finding[] = [];
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    const httpErrors: string[] = [];
    const origin = new URL(baseUrl).origin;

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

    await context.addInitScript(seedScript(route));
    await page.goto(`${baseUrl}${route.path}`, { waitUntil: 'load' });

    const blank = await isRootBlank(page);
    if (blank) {
      failures.push({
        kind: 'root-vazio',
        detail: '#root sem conteúdo renderizado',
      });
    }

    if (!blank) {
      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      if (overflow.scrollWidth > overflow.clientWidth + 1) {
        failures.push({
          kind: 'overflow',
          detail: `${overflow.scrollWidth}px de largura para ${overflow.clientWidth}px de viewport`,
        });
      }
    }

    for (const message of consoleErrors) {
      failures.push({ kind: 'console', detail: message });
    }
    for (const message of pageErrors) {
      failures.push({ kind: 'pageerror', detail: message });
    }
    for (const message of httpErrors) {
      failures.push({ kind: 'http', detail: message });
    }

    let baselined = 0;
    const axe = await new AxeBuilder({ page }).analyze();
    for (const violation of axe.violations) {
      if (violation.impact !== 'serious' && violation.impact !== 'critical') {
        continue;
      }
      const known = { route: route.path, rule: violation.id };
      if (isBaselined(known, BASELINE)) {
        baselined += 1;
        continue;
      }
      failures.push({
        kind: 'axe',
        detail: `${violation.id} (${violation.impact}) — ${violation.help} em ${violation.nodes.length} nó(s)`,
      });
    }

    return { failures, baselined };
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

  const server = await serve(BLANK_FIXTURE);
  let browser: Browser | undefined;

  try {
    browser = await startBrowser();
    const context = await browser.newContext({
      viewport: { width: VIEWPORTS[0].width, height: VIEWPORTS[0].height },
      reducedMotion: 'reduce',
    });

    try {
      const page = await context.newPage();
      await page.goto(`${server.url}/`, { waitUntil: 'load' });
      if (await isRootBlank(page)) {
        console.log('selftest OK: bundle em branco detectado');
        return 0;
      }
    } finally {
      await context.close();
    }

    console.error('selftest FALHOU: bundle em branco não foi detectado');
    return 1;
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
