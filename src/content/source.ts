import type { Source } from './schema';
import { TIAW_DOCS } from './tree';

export type SourceKind = 'aula' | 'tiaw' | 'repo' | 'orientacao';

const TIAW_TITLES: Record<(typeof TIAW_DOCS)[number], string> = {
  'tiaw-json': 'Estruturas de Dados e JSON',
  'tiaw-design-thinking': 'Design Thinking',
  'tiaw-dtg': 'Isto é Design Thinking (DTG)',
  'tiaw-requisitos': 'Engenharia de Requisitos',
};

/** The legacy `{aula, slide}` form has no `kind`; everything else does. */
export function sourceKind(source: Source): SourceKind {
  return 'kind' in source ? source.kind : 'aula';
}

/** PT-BR label shown under a quiz answer or a flashcard. */
export function formatSource(source: Source): string {
  if (!('kind' in source)) {
    return `Fonte: aula ${source.aula}, slide ${source.slide}`;
  }

  switch (source.kind) {
    case 'tiaw':
      return `Fonte: TIAW, ${TIAW_TITLES[source.doc]}, slide ${source.slide}`;
    case 'repo': {
      const path = source.path.replace(/^PROJETOS\//, '');
      return `Fonte: repositório da disciplina, ${path}, linhas ${source.startLine} a ${source.endLine}`;
    }
    case 'orientacao':
      return 'Fonte: orientações da Prova 2';
  }
}
