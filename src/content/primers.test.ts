import { describe, expect, it } from 'vitest';
import { getPrimer, hasPrimer } from './primers';

describe('primers getter', () => {
  it('returns undefined when a node has no primers.json', async () => {
    expect(hasPrimer('n01')).toBe(false);
    expect(await getPrimer('n01')).toBeUndefined();
  });
});
