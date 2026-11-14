import { readFileSync, readdirSync, mkdirSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { chromium, type Page } from 'playwright';
import { filterScreens, protoShotName, type ProtoScreen } from './lib/shots';
import { SMOKE_ROUTES, THEMES, VIEWPORTS } from './lib/smoke-routes';

/** Fora do repositório: nada daqui é commitado. */
const OUT = process.env.SHOTS_DIR ?? join(tmpdir(), 'diw-arcade-shots');
const DIST = fileURLToPath(new URL('../dist', import.meta.url));
const CONTENT = fileURLToPath(new URL('../src/content', import.meta.url));
const SAVE_KEY = 'diw-arcade:save';

type Persona = 'fresh' | 'mid' | 'late';

interface Item {
  id: string;
  nodeId: string;
}

function readItems(nodeId: string, file: string): Item[] {
  try {
    return JSON.parse(
      readFileSync(join(CONTENT, nodeId, `${file}.json`), 'utf8'),
    ) as Item[];
  } catch {
    return [];
  }
}

const NODES = readdirSync(CONTENT)
  .filter((name) => /^n\d+$/.test(name))
  .sort();

function iso(daysAgo: number, hour = 12): string {
  const d = new Date();
  d.setUTCHours(hour, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString();
}

/** Save vivido: `finished` nós concluídos, uma sequência de dias e cartas devidas. */
function buildSave(finished: number): Record<string, unknown> {
  const quizRounds: Record<string, unknown> = {};
  const cards: Record<string, unknown> = {};
  const introduced: Record<string, string> = {};
  const challenges: Record<string, unknown> = {};
  const primersRead: Record<string, string> = {};
  const days: Record<string, unknown> = {};
  let xp = 0;

  NODES.slice(0, finished).forEach((nodeId, index) => {
    quizRounds[nodeId] = { best: 8, count: 2, perfect: index % 3 === 0 };
    primersRead[nodeId] = iso(finished - index);
    xp += 120;
    for (const challenge of readItems(nodeId, 'challenges')) {
      challenges[challenge.id] = {
        passed: true,
        failedRuns: index % 2,
        hintsUsed: 0,
        xpAwarded: 40,
        code: null,
      };
      xp += 40;
    }
    readItems(nodeId, 'flashcards').forEach((card, cardIndex) => {
      const due = cardIndex % 4 === 0 ? iso(1) : iso(-(cardIndex % 9) - 1);
      cards[card.id] = {
        due,
        stability: 4 + cardIndex,
        difficulty: 5,
        elapsedDays: 2,
        scheduledDays: 4,
        learningSteps: 0,
        reps: 3,
        lapses: cardIndex % 5 === 0 ? 1 : 0,
        state: 2,
        lastReview: iso(3),
      };
      introduced[card.id] = iso(finished - index).slice(0, 10);
    });
  });

  for (let day = 0; day < Math.min(finished + 3, 12); day += 1) {
    days[iso(day).slice(0, 10)] = {
      xp: 40 + day * 7,
      quiz: 1,
      cards: 8 + day,
      challenges: day % 2,
      labs: 0,
    };
  }

  return {
    schemaVersion: 2,
    createdAt: iso(40),
    onboarded: true,
    xpTotal: xp,
    days,
    settings: { dailyGoal: 50, sound: false, newCardsPerDay: 20, reviewsPerDay: 100 },
    quiz: { answers: {}, rounds: quizRounds },
    cards,
    introduced,
    reviews: [],
    challenges,
    labs: {},
    achievements: { 'primeiro-passo': iso(30) },
    primersRead,
  };
}

const SAVES: Record<Persona, Record<string, unknown> | null> = {
  fresh: null,
  mid: buildSave(8),
  late: buildSave(NODES.length - 2),
};

/** Qual persona cada rota usa; /trilha ganha as três. */
function personasFor(path: string, seed?: 'fresh'): Persona[] {
  if (seed === 'fresh') return ['fresh'];
  if (path === '/trilha') return ['fresh', 'mid', 'late'];
  return ['mid'];
}

function slug(path: string): string {
  const s = path.replace(/^\//, '').replace(/[/?=]+/g, '-');
  return s === '' ? 'index' : s;
}

const MIME: Record<string, string> = {
  '.css': 'text/css',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

async function serve(): Promise<{ url: string; close: () => void }> {
  const server = createServer(async (request, response) => {
    const pathname = decodeURIComponent(
      new URL(request.url ?? '/', 'http://x').pathname,
    );
    const file = resolve(DIST, `.${pathname}`);
    try {
      if (!file.startsWith(`${DIST}${sep}`)) throw new Error('fora');
      if ((await stat(file)).isDirectory()) throw new Error('dir');
      response.writeHead(200, {
        'content-type': MIME[extname(file)] ?? 'application/octet-stream',
      });
      response.end(await readFile(file));
    } catch {
      response.writeHead(200, { 'content-type': MIME['.html'] });
      response.end(await readFile(join(DIST, 'index.html')));
    }
  });
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  const { port } = server.address() as AddressInfo;
  return { url: `http://127.0.0.1:${port}`, close: () => server.close() };
}

interface Question {
  type: 'mcq' | 'tf' | 'fill';
  prompt: string;
  options?: string[];
  answer?: number | boolean;
  answers?: string[];
}

const QUESTIONS = JSON.parse(
  readFileSync(join(CONTENT, 'n09', 'questions.json'), 'utf8'),
) as Question[];

const squash = (text: string): string => text.replace(/\s+/g, ' ').trim();

/** Responde a questão exibida, certa ou errada, e devolve ao estado com feedback. */
async function answerShown(page: Page, correct: boolean): Promise<void> {
  const prompt = squash(
    await page.locator('.quiz-round__prompt').first().innerText(),
  );
  const q = QUESTIONS.find((item) => squash(item.prompt) === prompt);
  if (!q) throw new Error(`questão não encontrada: ${prompt}`);
  if (q.type === 'fill') {
    const input = page.getByLabel('Sua resposta');
    await input.fill(correct ? (q.answers?.[0] ?? '') : 'resposta errada');
    await input.press('Enter');
    return;
  }
  let label: string;
  if (q.type === 'tf') {
    label = (q.answer === true) === correct ? 'Verdadeiro' : 'Falso';
  } else {
    const options = q.options ?? [];
    const right = q.answer as number;
    label = options[correct ? right : (right + 1) % options.length] ?? '';
  }
  await page.getByText(label, { exact: true }).click();
  const send = page.getByRole('button', { name: 'Responder' });
  if ((await send.count()) > 0) await send.click();
}

async function continueRound(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Continuar' }).click();
}

async function driveQuiz(page: Page, state: ProtoScreen['state']): Promise<void> {
  await page.waitForSelector('.quiz-round__prompt', { timeout: 15_000 });
  if (state === 'quiz') return;
  if (state === 'quiz-erro') {
    await answerShown(page, false);
    await page.waitForSelector('.quiz-round__feedback');
    return;
  }
  for (const correct of [false, false]) {
    await answerShown(page, correct);
    await continueRound(page);
  }
  const summary = page.locator('[aria-label="Resumo da rodada"]');
  for (let i = 0; i < 60 && (await summary.count()) === 0; i += 1) {
    await answerShown(page, true);
    await continueRound(page);
  }
  await summary.waitFor();
}

/** Elementos interativos visíveis com menos de 44px em alguma dimensão. */
async function smallTargets(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const nodes = document.querySelectorAll(
      'a[href], button, input, select, textarea, [role="button"], [role="tab"]',
    );
    const found: string[] = [];
    nodes.forEach((el) => {
      const r = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      if (r.width === 0 || r.height === 0 || style.visibility === 'hidden') return;
      // Skip link and sr-only elements are visually hidden (1px clip).
      if (el.matches('.shell__skip, .sr-only, .visually-hidden')) return;
      if (r.width <= 1 && r.height <= 1) return;
      if (r.width < 44 || r.height < 44) {
        const cls = typeof el.className === 'string' ? el.className.trim().replace(/\s+/g, '.') : '';
        const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 40);
        found.push(`${el.tagName.toLowerCase()}${cls ? `.${cls}` : ''} "${text}" ${Math.round(r.width)}x${Math.round(r.height)}`);
      }
    });
    return found;
  });
}

async function protoMain(
  browser: Awaited<ReturnType<typeof chromium.launch>>,
  baseUrl: string,
  only: string | undefined,
): Promise<number> {
  let count = 0;
  for (const screen of filterScreens(only)) {
    for (const viewport of VIEWPORTS) {
      for (const theme of THEMES) {
        const context = await browser.newContext({
          viewport: { width: viewport.width, height: viewport.height },
          reducedMotion: 'reduce',
        });
        const save = SAVES[screen.persona];
        await context.addInitScript(`if (window === window.top) { try {
          localStorage.setItem('diw-theme', ${JSON.stringify(theme)});
          ${
            save === null
              ? `localStorage.removeItem(${JSON.stringify(SAVE_KEY)});`
              : `localStorage.setItem(${JSON.stringify(SAVE_KEY)}, ${JSON.stringify(JSON.stringify(save))});`
          }
        } catch {} }`);
        const page = await context.newPage();
        await page.goto(`${baseUrl}${screen.path}`, { waitUntil: 'load' });
        await page
          .waitForSelector('main h1', { timeout: 15_000 })
          .catch(() => undefined);
        if (screen.state) await driveQuiz(page, screen.state);
        await page.waitForTimeout(300);
        for (const full of [false, true]) {
          const name = protoShotName(viewport, theme, screen.screen, full);
          await page.screenshot({ path: join(OUT, name), fullPage: full });
          console.log(join(OUT, name));
          count += 1;
        }
        if (viewport.width < 600) {
          const small = await smallTargets(page);
          console.log(`alvos<44px: ${small.length} (${screen.screen}, ${theme})`);
          for (const line of small) console.log(`  - ${line}`);
        }
        await context.close();
      }
    }
  }
  return count;
}

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const server = await serve();
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.SMOKE_CHROMIUM_PATH
      ? { executablePath: process.env.SMOKE_CHROMIUM_PATH }
      : {}),
  });
  let count = 0;
  const args = process.argv.slice(2);
  const onlyIndex = args.indexOf('--only');
  const only = onlyIndex >= 0 ? args[onlyIndex + 1] : undefined;
  try {
    if (args.includes('--proto')) {
      count = await protoMain(browser, server.url, only);
    } else
    {
    for (const route of SMOKE_ROUTES) {
      for (const persona of personasFor(route.path, route.seed)) {
        for (const viewport of VIEWPORTS) {
          for (const theme of THEMES) {
            const context = await browser.newContext({
              viewport: { width: viewport.width, height: viewport.height },
              reducedMotion: 'reduce',
            });
            const save = SAVES[persona];
            await context.addInitScript(`if (window === window.top) { try {
              localStorage.setItem('diw-theme', ${JSON.stringify(theme)});
              ${
                save === null
                  ? `localStorage.removeItem(${JSON.stringify(SAVE_KEY)});`
                  : `localStorage.setItem(${JSON.stringify(SAVE_KEY)}, ${JSON.stringify(JSON.stringify(save))});`
              }
            } catch {} }`);
            const page = await context.newPage();
            await page.goto(`${server.url}${route.path}`, { waitUntil: 'load' });
            await page
              .waitForSelector('main h1', { timeout: 15_000 })
              .catch(() => undefined);
            await page.waitForTimeout(300);
            const name =
              `${slug(route.path)}${route.path === '/trilha' ? `-${persona}` : ''}` +
              `-${viewport.width}-${theme}.png`;
            await page.screenshot({ path: join(OUT, name), fullPage: true });
            console.log(join(OUT, name));
            count += 1;
            await context.close();
          }
        }
      }
    }
    }
  } finally {
    await browser.close();
    server.close();
  }
  console.log(`screenshots: ${count} PNGs em ${OUT}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
