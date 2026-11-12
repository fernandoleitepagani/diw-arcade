import { describe, expect, it } from 'vitest';
import { evaluateBudget, findEntryAssets, type BudgetSizes } from './budget';

const INDEX_HTML = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <script type="module" crossorigin src="/assets/index-abc123.js"></script>
    <link rel="stylesheet" crossorigin href="/assets/index-def456.css">
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`;

const LIMITS: BudgetSizes = {
  entryJsGzipKb: 130,
  entryCssGzipKb: 12,
  totalJsGzipKb: 400,
};

describe('findEntryAssets', () => {
  it('extrai o JS e o CSS de entrada do index.html', () => {
    expect(findEntryAssets(INDEX_HTML)).toEqual({
      js: ['/assets/index-abc123.js'],
      css: ['/assets/index-def456.css'],
    });
  });
});

describe('evaluateBudget', () => {
  it('aprova quando todas as medidas estão no limite', () => {
    const result = evaluateBudget(LIMITS, LIMITS);

    expect(result.ok).toBe(true);
    expect(result.rows.map((row) => row.ok)).toEqual([true, true, true]);
  });

  it('reprova e marca a linha que passou do limite', () => {
    const result = evaluateBudget(
      { ...LIMITS, entryCssGzipKb: 12.01 },
      LIMITS,
    );

    expect(result.ok).toBe(false);
    expect(result.rows.filter((row) => !row.ok)).toEqual([
      {
        key: 'entryCssGzipKb',
        label: 'CSS de entrada',
        measuredKb: 12.01,
        limitKb: 12,
        ok: false,
      },
    ]);
  });
});
