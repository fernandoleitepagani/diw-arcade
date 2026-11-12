import { describe, expect, it } from 'vitest';
import { looksPtBr } from './ptbr';

describe('looksPtBr', () => {
  it('recognises a Portuguese sentence', () => {
    expect(looksPtBr('Você deve usar a tag para criar um link.')).toBe(true);
  });

  it('rejects an English sentence', () => {
    expect(looksPtBr('Choose the correct tag')).toBe(false);
  });

  it('compares text padded and lowercased', () => {
    expect(looksPtBr('NÃO')).toBe(true);
    expect(looksPtBr('elemento com estilo')).toBe(true);
  });
});
