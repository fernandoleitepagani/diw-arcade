import { describe, expect, it } from 'vitest';
import { UNIT_COLOR } from './unitColors';

describe('UNIT_COLOR', () => {
  it('maps u1 to u6 to fund, html, css, ux, js, prova', () => {
    expect(UNIT_COLOR).toEqual({
      u1: 'var(--u-fund)',
      u2: 'var(--u-html)',
      u3: 'var(--u-css)',
      u4: 'var(--u-ux)',
      u5: 'var(--u-js)',
      u6: 'var(--u-prova)',
    });
  });
});
