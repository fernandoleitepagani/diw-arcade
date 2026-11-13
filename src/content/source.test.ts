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
      { aula: 174, slide: 3 },
      'Fonte: aula 174, slide 3',
    ],
    [
      'tiaw',
      { kind: 'tiaw', doc: 'tiaw-design-thinking', slide: 4 },
      'Fonte: TIAW, Design Thinking, slide 4',
    ],
    [
      'repo',
      {
        kind: 'repo',
        path: 'PROJETOS/exemplos/app.js',
        startLine: 3,
        endLine: 9,
      },
      'Fonte: repositório da disciplina, exemplos/app.js, linhas 3 a 9',
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
