import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  checkRoutePage,
  isBaselined,
  REDIRECT_CHECKS,
  SMOKE_ROUTES,
  THEMES,
  VIEWPORTS,
  baselineProblems,
  type RoutePage,
} from './smoke-routes';

/** Harness de teste: registra a ordem das operações e permite trocar respostas. */
function harness(
  calls: string[],
  overrides: Partial<RoutePage> = {},
): RoutePage {
  return {
    isRootBlank: async () => {
      calls.push('blank');
      return false;
    },
    waitForHeading: async () => {
      calls.push('h1');
      return true;
    },
    measureOverflow: async () => {
      calls.push('overflow');
      return { scrollWidth: 1280, clientWidth: 1280 };
    },
    runAxe: async () => {
      calls.push('axe');
      return [];
    },
    probeInteraction: async (kind) => {
      calls.push(`probe:${kind}`);
      return null;
    },
    collectErrors: async () => {
      calls.push('errors');
      return [];
    },
    ...overrides,
  };
}

describe('rotas do smoke', () => {
  it('cobre as 18 rotas do app', () => {
    expect(SMOKE_ROUTES.map((route) => route.path)).toEqual([
      '/',
      '/?inicio',
      '/hoje',
      '/trilha',
      '/no/n01',
      '/no/n01?passo=ler',
      '/no/n01/quiz',
      '/no/n01/cartas',
      '/no/n15',
      '/no/n15/quiz',
      '/desafio/n19-c01',
      '/revisao',
      '/desafio/n01-c01',
      '/laboratorios/lab-01',
      '/progresso',
      '/ajustes',
      '/boas-vindas',
      '/caminho-inexistente',
    ]);
  });

  it('sonda os dois temas', () => {
    expect([...THEMES]).toEqual(['dark', 'light']);
  });

  it('confere os redirects das rotas antigas', () => {
    expect([...REDIRECT_CHECKS]).toEqual([
      { from: '/estatisticas', to: '/progresso' },
      { from: '/laboratorios', to: '/trilha' },
    ]);
  });

  it('cobre as 2 larguras', () => {
    expect(VIEWPORTS.map((viewport) => viewport.width)).toEqual([1280, 375]);
  });

  it('marca as rotas com sondagem de interação', () => {
    const probes = Object.fromEntries(
      SMOKE_ROUTES.filter((route) => route.probe !== undefined).map(
        (route) => [route.path, route.probe],
      ),
    );

    expect(probes).toEqual({
      '/no/n01/quiz': 'quiz',
      '/no/n01/cartas': 'flashcard',
      '/no/n15/quiz': 'quiz',
    });
  });

  it('isBaselined casa rota e regra', () => {
    const baseline = [{ route: '/no/n01', rule: 'color-contrast' }];

    expect(
      isBaselined(
        { route: '/no/n01', rule: 'color-contrast' },
        baseline,
      ),
    ).toBe(true);
    expect(
      isBaselined({ route: '/no/n01', rule: 'button-name' }, baseline),
    ).toBe(false);
    expect(
      isBaselined(
        { route: '/revisao', rule: 'color-contrast' },
        baseline,
      ),
    ).toBe(false);
  });
});

describe('checagem da página renderizada', () => {
  it('espera o main h1 antes de medir overflow e rodar axe', async () => {
    const calls: string[] = [];

    const result = await checkRoutePage(
      { path: '/trilha', label: 'trilha' },
      harness(calls),
      [],
    );

    expect(calls).toEqual(['blank', 'h1', 'overflow', 'axe', 'errors']);
    expect(result.failures).toEqual([]);
  });

  it('falha a rota quando o main h1 nunca aparece e não mede o esqueleto', async () => {
    const calls: string[] = [];

    const result = await checkRoutePage(
      { path: '/progresso', label: 'progresso' },
      harness(calls, {
        waitForHeading: async () => {
          calls.push('h1');
          return false;
        },
      }),
      [],
    );

    expect(calls).toEqual(['blank', 'h1', 'errors']);
    expect(result.failures).toEqual([
      {
        kind: 'h1-ausente',
        detail: expect.stringContaining('main h1'),
      },
    ]);
  });

  it('pula a espera do h1 quando o root está vazio', async () => {
    const calls: string[] = [];

    const result = await checkRoutePage(
      { path: '/trilha', label: 'trilha' },
      harness(calls, {
        isRootBlank: async () => {
          calls.push('blank');
          return true;
        },
      }),
      [],
    );

    expect(calls).toEqual(['blank', 'errors']);
    expect(result.failures).toEqual([
      { kind: 'root-vazio', detail: expect.stringContaining('#root') },
    ]);
  });

  it('detecta overflow depois do h1', async () => {
    const calls: string[] = [];

    const result = await checkRoutePage(
      { path: '/progresso', label: 'progresso' },
      harness(calls, {
        measureOverflow: async () => {
          calls.push('overflow');
          return { scrollWidth: 4000, clientWidth: 1280 };
        },
      }),
      [],
    );

    expect(calls).toEqual(['blank', 'h1', 'overflow', 'axe', 'errors']);
    expect(result.failures).toContainEqual({
      kind: 'overflow',
      detail: '4000px de largura para 1280px de viewport',
    });
  });

  it('roda a sondagem de interação e propaga a falha', async () => {
    const calls: string[] = [];

    const ok = await checkRoutePage(
      { path: '/no/n01/quiz', label: 'quiz', probe: 'quiz' },
      harness(calls),
      [],
    );
    expect(calls).toEqual(['blank', 'h1', 'overflow', 'axe', 'probe:quiz', 'errors']);
    expect(ok.failures).toEqual([]);

    const callsWithFailure: string[] = [];
    const failed = await checkRoutePage(
      { path: '/no/n01/cartas', label: 'cartas do nó', probe: 'flashcard' },
      harness(callsWithFailure, {
        probeInteraction: async (kind) => {
          callsWithFailure.push(`probe:${kind}`);
          return 'carta não revelou a resposta';
        },
      }),
      [],
    );

    expect(failed.failures).toEqual([
      { kind: 'interacao', detail: 'carta não revelou a resposta' },
    ]);
  });

  it('lê os erros só no fim, inclusive os do axe', async () => {
    const calls: string[] = [];

    const result = await checkRoutePage(
      { path: '/ajustes', label: 'ajustes' },
      harness(calls, {
        runAxe: async () => {
          calls.push('axe');
          return [
            { id: 'button-name', impact: 'critical', help: 'Botão sem nome', nodes: 1 },
          ];
        },
        collectErrors: async () => {
          calls.push('errors');
          return [{ kind: 'console', detail: 'boom' }];
        },
      }),
      [],
    );

    expect(calls.at(-1)).toBe('errors');
    expect(result.failures.map((finding) => finding.kind)).toEqual([
      'axe',
      'console',
    ]);
  });

  it('conta violações sérias da baseline nas demais rotas', async () => {
    const result = await checkRoutePage(
      { path: '/no/n01', label: 'nó' },
      harness([], {
        runAxe: async () => [
          { id: 'color-contrast', impact: 'serious', help: 'Contraste', nodes: 2 },
          { id: 'button-name', impact: 'critical', help: 'Nome', nodes: 1 },
        ],
      }),
      [{ route: '/no/n01', rule: 'color-contrast' }],
    );

    expect(result.baselined).toBe(1);
    expect(result.failures).toEqual([
      { kind: 'axe', detail: expect.stringContaining('button-name') },
    ]);
  });
});

describe('smoke-baseline.json', () => {
  it('exige um motivo escrito e só tolera color-contrast', () => {
    const entries = JSON.parse(
      readFileSync('scripts/smoke-baseline.json', 'utf8'),
    ) as { route: string; rule: string; reason?: string }[];
    for (const entry of entries) {
      expect(entry.rule).toBe('color-contrast');
      expect(entry.reason?.trim()).toBeTruthy();
    }
  });
});

describe('baselineProblems', () => {
  it('rejeita entrada sem motivo ou com regra diferente de color-contrast', () => {
    expect(
      baselineProblems([{ route: '/a', rule: 'color-contrast', reason: 'x' }]),
    ).toEqual([]);
    expect(
      baselineProblems([{ route: '/a', rule: 'color-contrast' }]),
    ).toHaveLength(1);
    expect(
      baselineProblems([{ route: '/a', rule: 'color-contrast', reason: ' ' }]),
    ).toHaveLength(1);
    expect(
      baselineProblems([{ route: '/a', rule: 'button-name', reason: 'x' }]),
    ).toHaveLength(1);
  });
});
