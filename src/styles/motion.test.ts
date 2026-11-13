import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const CSS_ROOT = 'src';
const MAX_DURATION_MS = 600;

const ALLOWLIST = new Set([
  // The recommended-node glow (2.8s) predates the motion gate. Task 11
  // (Home path map) owns the replacement pulse and must keep it under 600ms.
  'src/features/tree/SkillTree.css',
]);

const MOTION_DECLARATION =
  /(?:^|[;\s{])(animation(?:-duration)?|transition(?:-duration)?)\s*:\s*([^;}]*)/gi;
const TIME_VALUE = /(\d*\.?\d+)(ms|s)\b/gi;

interface Violation {
  file: string;
  property: string;
  value: string;
  durationMs: number;
}

function findViolations(source: string, file: string): Violation[] {
  const stylesheet = source.replace(/\/\*[\s\S]*?\*\//g, '');
  const violations: Violation[] = [];

  for (const declaration of stylesheet.matchAll(MOTION_DECLARATION)) {
    const property = declaration[1]?.toLowerCase() ?? '';
    const value = declaration[2] ?? '';

    for (const time of value.matchAll(TIME_VALUE)) {
      const amount = Number(time[1]);
      const durationMs =
        (time[2] ?? '').toLowerCase() === 's' ? amount * 1000 : amount;

      if (durationMs > MAX_DURATION_MS) {
        violations.push({ file, property, value: value.trim(), durationMs });
      }
    }
  }

  return violations;
}

function cssFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      return cssFiles(path);
    }

    return entry.name.endsWith('.css') ? [path] : [];
  });
}

describe('CSS motion guard', () => {
  it('keeps every animation and transition at or under 600ms', () => {
    const violations = cssFiles(CSS_ROOT)
      .filter((file) => !ALLOWLIST.has(file))
      .flatMap((file) => findViolations(readFileSync(file, 'utf8'), file));

    expect(violations).toEqual([]);
  });

  it('flags durations above 600ms', () => {
    expect(
      findViolations('.a { animation: spin 601ms linear; }', 'fixture.css'),
    ).toHaveLength(1);
    expect(
      findViolations('.a { transition: color 0.8s ease; }', 'fixture.css'),
    ).toHaveLength(1);
  });

  it('allows exactly 600ms and keyword values', () => {
    expect(
      findViolations(
        '.a { transition: color 600ms ease; animation: none; }',
        'fixture.css',
      ),
    ).toEqual([]);
  });

  it('keeps the global reduced-motion override', () => {
    const globalCss = readFileSync('src/styles/global.css', 'utf8');

    expect(globalCss).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{/);
    expect(globalCss).toMatch(/animation-duration:\s*0\.01ms/);
    expect(globalCss).toMatch(/transition-duration:\s*0\.01ms/);
  });
});
