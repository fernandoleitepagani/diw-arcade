import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium, type Browser, type LaunchOptions } from 'playwright';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PUBLIC = resolve(ROOT, 'public');
const OG_TEMPLATE = resolve(ROOT, 'scripts/assets/og.html');
const FAVICON = resolve(PUBLIC, 'favicon.svg');

const OG_SIZE = { width: 1200, height: 630 } as const;
const THEME_COLOR = '#0a1128';

const MANIFEST = {
  name: 'DIW Arcade',
  short_name: 'DIW Arcade',
  description:
    'Pratique Desenvolvimento de Interfaces Web como num fliperama.',
  lang: 'pt-BR',
  start_url: '/',
  display: 'standalone',
  background_color: THEME_COLOR,
  theme_color: THEME_COLOR,
  icons: [
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
  ],
} as const;

/** Mesma resolução de Chromium do smoke: variável de ambiente ou padrão do Playwright. */
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

async function renderOg(browser: Browser): Promise<void> {
  const context = await browser.newContext({
    viewport: OG_SIZE,
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  });

  try {
    const page = await context.newPage();
    await page.goto(pathToFileURL(OG_TEMPLATE).href, { waitUntil: 'load' });
    await page.evaluate(async () => {
      await document.fonts.ready;
    });

    const fontsLoaded = await page.evaluate(() =>
      ['400 80px "Press Start 2P"', '400 25px "Inter"', '600 22px "Inter"'].every(
        (font) => document.fonts.check(font),
      ),
    );
    if (!fontsLoaded) {
      throw new Error(
        'as fontes do template OG não carregaram; confira os caminhos em scripts/assets/og.html',
      );
    }

    await page.screenshot({
      path: resolve(PUBLIC, 'og.png'),
      animations: 'disabled',
    });
  } finally {
    await context.close();
  }
}

async function renderIcon(
  browser: Browser,
  svg: string,
  size: number,
  file: string,
  opaque: boolean,
): Promise<void> {
  const context = await browser.newContext({
    viewport: { width: size, height: size },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  });

  try {
    const page = await context.newPage();
    const background = opaque ? THEME_COLOR : 'transparent';
    await page.setContent(
      `<!doctype html><html><head><meta charset="utf-8"><style>
        html, body { margin: 0; width: ${size}px; height: ${size}px; overflow: hidden; background: ${background}; }
        svg { display: block; width: 100%; height: 100%; }
      </style></head><body>${svg}</body></html>`,
      { waitUntil: 'load' },
    );

    await page.screenshot({
      path: resolve(PUBLIC, file),
      animations: 'disabled',
      omitBackground: !opaque,
    });
  } finally {
    await context.close();
  }
}

async function main(): Promise<void> {
  const browser = await startBrowser();

  try {
    const favicon = await readFile(FAVICON, 'utf8');

    await renderOg(browser);
    await renderIcon(browser, favicon, 192, 'icon-192.png', false);
    await renderIcon(browser, favicon, 512, 'icon-512.png', false);
    await renderIcon(browser, favicon, 180, 'apple-touch-icon.png', true);
    await renderIcon(browser, favicon, 32, 'favicon-32.png', false);

    await writeFile(
      resolve(PUBLIC, 'site.webmanifest'),
      `${JSON.stringify(MANIFEST, null, 2)}\n`,
    );

    console.log('assets: og.png, 4 ícones e site.webmanifest gerados');
  } finally {
    await browser.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
