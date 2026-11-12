import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import {
  evaluateBudget,
  findEntryAssets,
  type BudgetSizes,
} from './lib/budget';

const DIST = fileURLToPath(new URL('../dist', import.meta.url));
const INDEX_HTML = join(DIST, 'index.html');
const CONFIG = fileURLToPath(
  new URL('./budget.config.json', import.meta.url),
);
const KB = 1024;

interface BudgetConfig extends BudgetSizes {
  _measured: BudgetSizes;
}

function gzipKb(path: string): number {
  return gzipSync(readFileSync(path), { level: 9 }).length / KB;
}

function distPath(assetUrl: string): string {
  return join(DIST, assetUrl.replace(/^\//, ''));
}

function listJsFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...listJsFiles(path));
    } else if (entry.name.endsWith('.js')) {
      files.push(path);
    }
  }
  return files;
}

function main(): void {
  if (!existsSync(INDEX_HTML)) {
    console.error(
      'dist/index.html não encontrado. Rode `npm run build` antes de `npm run budget`.',
    );
    process.exitCode = 1;
    return;
  }

  const indexHtml = readFileSync(INDEX_HTML, 'utf8');
  const { js, css } = findEntryAssets(indexHtml);
  if (js.length === 0 || css.length === 0) {
    console.error('index.html sem JS ou CSS de entrada; build inesperado.');
    process.exitCode = 1;
    return;
  }

  const config = JSON.parse(readFileSync(CONFIG, 'utf8')) as BudgetConfig;
  const sizes: BudgetSizes = {
    entryJsGzipKb: js.reduce((total, url) => total + gzipKb(distPath(url)), 0),
    entryCssGzipKb: css.reduce(
      (total, url) => total + gzipKb(distPath(url)),
      0,
    ),
    totalJsGzipKb: listJsFiles(DIST).reduce(
      (total, path) => total + gzipKb(path),
      0,
    ),
  };
  const result = evaluateBudget(sizes, config);

  console.log('Orçamento de bundle (gzip, KB)');
  console.log(
    'Métrica'.padEnd(18) +
      'Medido'.padStart(9) +
      'Limite'.padStart(9) +
      '  Status',
  );
  for (const row of result.rows) {
    console.log(
      row.label.padEnd(18) +
        row.measuredKb.toFixed(2).padStart(9) +
        row.limitKb.toFixed(0).padStart(9) +
        '  ' +
        (row.ok ? 'OK' : 'ACIMA DO LIMITE'),
    );
  }

  if (!result.ok) {
    console.error('budget FAILED: há medida acima do limite.');
    process.exitCode = 1;
  }
}

main();
