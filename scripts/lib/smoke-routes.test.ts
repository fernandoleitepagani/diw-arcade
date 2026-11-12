import { describe, expect, it } from 'vitest';
import { isBaselined, SMOKE_ROUTES, VIEWPORTS } from './smoke-routes';

describe('rotas do smoke', () => {
  it('cobre as 12 rotas do app', () => {
    expect(SMOKE_ROUTES.map((route) => route.path)).toEqual([
      '/',
      '/no/n01',
      '/no/n01/quiz',
      '/no/n01/cartas',
      '/revisao',
      '/desafio/n01-c01',
      '/laboratorios',
      '/laboratorios/lab-01',
      '/estatisticas',
      '/ajustes',
      '/boas-vindas',
      '/caminho-inexistente',
    ]);
  });

  it('cobre as 2 larguras', () => {
    expect(VIEWPORTS.map((viewport) => viewport.width)).toEqual([1280, 375]);
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
