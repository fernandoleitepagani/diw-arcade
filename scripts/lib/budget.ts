export interface BudgetSizes {
  entryJsGzipKb: number;
  entryCssGzipKb: number;
  totalJsGzipKb: number;
}

export type BudgetMetric = keyof BudgetSizes;

export interface Row {
  key: BudgetMetric;
  label: string;
  measuredKb: number;
  limitKb: number;
  ok: boolean;
}

const METRICS: readonly BudgetMetric[] = [
  'entryJsGzipKb',
  'entryCssGzipKb',
  'totalJsGzipKb',
];

const LABELS: Record<BudgetMetric, string> = {
  entryJsGzipKb: 'JS de entrada',
  entryCssGzipKb: 'CSS de entrada',
  totalJsGzipKb: 'JS total',
};

function attribute(tag: string, name: string): string | undefined {
  const match = new RegExp(
    `(?:^|\\s)${name}\\s*=\\s*["']([^"']+)["']`,
    'i',
  ).exec(tag);
  return match?.[1];
}

/** Assets carregados diretamente pelo index.html do build. */
export function findEntryAssets(indexHtml: string): {
  js: string[];
  css: string[];
} {
  const js: string[] = [];
  const css: string[] = [];

  for (const match of indexHtml.matchAll(/<script\b[^>]*>/gi)) {
    const src = attribute(match[0], 'src');
    if (src && !js.includes(src)) {
      js.push(src);
    }
  }

  for (const match of indexHtml.matchAll(/<link\b[^>]*>/gi)) {
    const tag = match[0];
    const href = attribute(tag, 'href');
    const rel = attribute(tag, 'rel')?.toLowerCase().split(/\s+/);
    if (href && rel?.includes('stylesheet') && !css.includes(href)) {
      css.push(href);
    }
  }

  return { js, css };
}

export function evaluateBudget(
  sizes: BudgetSizes,
  limits: BudgetSizes,
): { ok: boolean; rows: Row[] } {
  const rows = METRICS.map((key): Row => {
    return {
      key,
      label: LABELS[key],
      measuredKb: sizes[key],
      limitKb: limits[key],
      ok: sizes[key] <= limits[key],
    };
  });

  return { ok: rows.every((row) => row.ok), rows };
}
