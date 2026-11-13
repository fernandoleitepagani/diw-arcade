import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(process.cwd(), 'src');
// Empty-value data placeholders, not prose.
const ALLOWED = ["'—'"];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === 'content' ? [] : walk(path);
    return /\.(tsx?|ts)$/.test(name) && !/\.test\./.test(name) && !path.includes('/test/')
      ? [path]
      : [];
  });
}

describe('copy rules', () => {
  it('has no em dashes or middle dots in user-facing strings', () => {
    const offenders: string[] = [];
    for (const file of walk(ROOT)) {
      readFileSync(file, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          if (!/[—·]/.test(line)) return;
          if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
          let rest = line;
          for (const a of ALLOWED) rest = rest.split(a).join('');
          if (/[—·]/.test(rest)) offenders.push(`${file}:${i + 1}: ${line.trim()}`);
        });
    }
    expect(offenders).toEqual([]);
  });
});
