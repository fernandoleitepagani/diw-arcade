import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// The runner CSS (frozen) still sets `font-family: var(--font-mono)` on
// `.sandbox-frame__report` at (0,1,0). It loads after index.css, so the shim
// in global.css must out-rank it with at least two class parts.
describe('runner report font shim', () => {
  it('overrides the runner report font with a selector of specificity >= (0,2,0)', () => {
    const css = readFileSync('src/styles/global.css', 'utf8');
    const rule = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].find(
      (m) =>
        (m[1] ?? '').includes('.sandbox-frame__report') &&
        /font-family\s*:\s*var\(--font-code\)/.test(m[2] ?? ''),
    );
    expect(rule, 'shim rule not found').toBeDefined();
    const selector = (rule?.[1] ?? '').trim().split(',').pop()!;
    const classes = selector.match(/\.[\w-]+/g) ?? [];
    expect(classes.length).toBeGreaterThanOrEqual(2);
  });
});
