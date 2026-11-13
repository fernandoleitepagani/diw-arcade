import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOTS = ['src', 'scripts'];
const EXTENSIONS = /\.(ts|tsx|css|html)$/;
const SELF = join('src', 'styles', 'removedCode.test.ts');

// Built from parts so this file never matches its own scan.
const REMOVED = [
  'Mas' + 'cot',
  'Aur' + 'ora',
  'Click' + 'Spark',
  'Shiny' + 'Text',
  'ProgressR' + 'ing',
  'StarR' + 'ating',
  'Press Start ' + '2P',
  '@fontsource/' + 'inter',
];

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === 'node_modules' ? [] : walk(path);
    }
    return EXTENSIONS.test(entry.name) && path !== SELF ? [path] : [];
  });
}

describe('removed redesign code', () => {
  it('leaves no trace of removed components or fonts in source or CSS', () => {
    const hits = ROOTS.flatMap(walk).flatMap((file) => {
      const text = readFileSync(file, 'utf8');
      return REMOVED.filter((word) => text.includes(word)).map(
        (word) => `${file}: ${word}`,
      );
    });
    expect(hits).toEqual([]);
  });
});
