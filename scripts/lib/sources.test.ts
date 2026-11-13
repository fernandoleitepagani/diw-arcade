import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadRepoLines, loadSlides } from './sources';

let dir = '';

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'diw-sources-'));
});

afterEach(() => {
  if (dir) {
    rmSync(dir, { recursive: true, force: true });
    dir = '';
  }
});

describe('loadSlides', () => {
  it('reads tiaw and orientacao documents as well as aulas and labs', () => {
    writeFileSync(join(dir, 'tiaw-json.txt'), 'Capa\fO JSON é texto.', 'utf8');
    writeFileSync(join(dir, 'orientacao-prova2.txt'), 'Prova 2', 'utf8');

    expect(loadSlides(dir, 'tiaw-json')).toEqual(['Capa', 'O JSON é texto.']);
    expect(loadSlides(dir, 'orientacao-prova2')).toEqual(['Prova 2']);
    expect(loadSlides(dir, 'aula-172')).toBeNull();
  });

  it('rejects document names outside the allowlist', () => {
    expect(() => loadSlides(dir, 'tiaw-json/../segredo')).toThrow(
      /Documento inválido/,
    );
    expect(() => loadSlides(dir, 'diario')).toThrow(/Documento inválido/);
  });
});

describe('loadRepoLines', () => {
  it('splits a file inside the repo root into lines', () => {
    mkdirSync(join(dir, 'PROJETOS', 'exemplo'), { recursive: true });
    writeFileSync(
      join(dir, 'PROJETOS', 'exemplo', 'app.js'),
      'const a = 1;\nconsole.log(a);',
      'utf8',
    );

    expect(loadRepoLines(dir, 'PROJETOS/exemplo/app.js')).toEqual([
      'const a = 1;',
      'console.log(a);',
    ]);
  });

  it('returns null for missing files and paths that leave the root', () => {
    writeFileSync(join(dir, 'fora.js'), 'x', 'utf8');

    expect(loadRepoLines(dir, 'PROJETOS/exemplo/app.js')).toBeNull();
    expect(loadRepoLines(dir, '../fora.js')).toBeNull();
  });
});
