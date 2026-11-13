import { describe, expect, it } from 'vitest';
import type { Source } from './schema';
import { formatSource, sourceKind } from './source';

describe('sourceKind', () => {
  it('labels the legacy aula source and every explicit kind', () => {
    expect(sourceKind({ aula: 172, slide: 2 })).toBe('aula');
    expect(sourceKind({ kind: 'tiaw', doc: 'tiaw-json', slide: 2 })).toBe(
      'tiaw',
    );
    expect(
      sourceKind({
        kind: 'repo',
        path: 'PROJETOS/exemplo/app.js',
        startLine: 1,
        endLine: 2,
      }),
    ).toBe('repo');
    expect(sourceKind({ kind: 'orientacao' })).toBe('orientacao');
  });
});

describe('formatSource', () => {
  const cases: ReadonlyArray<readonly [string, Source, string]> = [
    [
      'aula',
      { aula: 172, slide: 2 },
      'Fonte: aula-172, slide 2',
    ],
    [
      'tiaw',
      { kind: 'tiaw', doc: 'tiaw-json', slide: 3 },
      'Fonte: TIAW · Estruturas de Dados e JSON, slide 3',
    ],
    [
      'repo',
      {
        kind: 'repo',
        path: 'PROJETOS/JSONServer/Projeto JSON Server - Pokedex/public/script.js',
        startLine: 10,
        endLine: 24,
      },
      'Fonte: repositório da disciplina · JSONServer/Projeto JSON Server - Pokedex/public/script.js, linhas 10–24',
    ],
    [
      'orientacao',
      { kind: 'orientacao' },
      'Fonte: orientações da Prova 2',
    ],
  ];

  it.each(cases)('formats a %s source', (_kind, source, expected) => {
    expect(formatSource(source)).toBe(expected);
  });
});
