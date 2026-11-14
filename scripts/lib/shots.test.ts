import { describe, expect, it } from 'vitest';
import { PROTO_SCREENS, filterScreens, protoShotName } from './shots';

describe('protoShotName', () => {
  it('nomeia o shot do celular em tela cheia como o protótipo', () => {
    expect(protoShotName({ width: 375 }, 'light', 'quiz-erro', true)).toBe(
      'phone-light-quiz-erro-full.png',
    );
  });

  it('nomeia o shot do desktop sem -full', () => {
    expect(protoShotName({ width: 1280 }, 'dark', 'hoje', false)).toBe(
      'desk-dark-hoje.png',
    );
  });
});

describe('PROTO_SCREENS', () => {
  it('cobre exatamente as 9 telas do protótipo', () => {
    expect(PROTO_SCREENS.map((s) => s.screen).sort()).toEqual(
      [
        'index', 'hoje', 'trilha', 'licao', 'ler',
        'quiz', 'quiz-erro', 'resumo', 'desafio',
      ].sort(),
    );
  });
});

describe('filterScreens', () => {
  it('filtra por tela', () => {
    expect(filterScreens('trilha')).toHaveLength(1);
  });

  it('sem filtro devolve todas', () => {
    expect(filterScreens()).toHaveLength(9);
  });
});
