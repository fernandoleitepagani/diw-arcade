import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC_ROOT = 'src';
const MIN_PIXEL_FONT_PX = 20;

function cssFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      return cssFiles(path);
    }
    return path.endsWith('.css') ? [path] : [];
  });
}

interface Rule {
  selector: string;
  body: string;
}

function rulesOf(source: string): Rule[] {
  const stripped = source.replace(/\/\*[\s\S]*?\*\//g, '');
  return [...stripped.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((match) => ({
    selector: (match[1] ?? '').trim(),
    body: match[2] ?? '',
  }));
}

// Returns the smallest font-size in px a rule declares, or null if none.
// For clamp(), the minimum (first argument) is what counts.
function declaredMinimumPx(body: string): number | null {
  const declarations = [...body.matchAll(/(?:^|;)\s*font-size\s*:\s*([^;]+)/gi)];
  if (declarations.length === 0) {
    return null;
  }

  const sizes = declarations.map(([, value = '']) => {
    const clampMatch = /clamp\(\s*([^,]+),/i.exec(value);
    const first = (clampMatch?.[1] ?? value).trim();
    const px = /^(\d*\.?\d+)px$/i.exec(first);
    const rem = /^(\d*\.?\d+)rem$/i.exec(first);
    if (px) {
      return Number(px[1]);
    }
    if (rem) {
      return Number(rem[1]) * 16;
    }
    return Number.NaN;
  });

  return Math.min(...sizes);
}

describe('pixel font floor', () => {
  it('never sets the pixel font below 20px', () => {
    const violations: string[] = [];

    for (const file of cssFiles(SRC_ROOT)) {
      for (const rule of rulesOf(readFileSync(file, 'utf8'))) {
        if (!rule.body.includes('var(--font-px')) {
          continue;
        }
        const size = declaredMinimumPx(rule.body);
        if (size === null || !(size >= MIN_PIXEL_FONT_PX)) {
          violations.push(`${file}: ${rule.selector} (${size ?? 'no font-size'})`);
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
