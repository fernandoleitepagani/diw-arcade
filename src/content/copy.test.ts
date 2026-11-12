import { describe, expect, it } from 'vitest';
import { looksPtBr } from '../lib/text/ptbr';
import { BIT_LINES, pickLine, type BitContext } from './copy';

const CONTEXTS: BitContext[] = [
  'welcome',
  'correct',
  'wrong',
  'challengePass',
  'levelUp',
  'streak',
  'empty',
];

const BANNED_TERMS = ['burro', 'fácil demais', 'vergonha', 'patético', 'sério?', 'óbvio'];

describe('BIT_LINES', () => {
  it('covers every Bit context', () => {
    expect(Object.keys(BIT_LINES).sort()).toEqual([...CONTEXTS].sort());
  });

  it.each(CONTEXTS)('has at least three friendly, short lines for %s', (context) => {
    const lines = BIT_LINES[context];

    expect(lines.length).toBeGreaterThanOrEqual(3);
    for (const line of lines) {
      expect(line.trim().length).toBeGreaterThan(0);
      expect(line.length).toBeLessThanOrEqual(90);
      expect(looksPtBr(line)).toBe(true);

      const lower = line.toLowerCase();
      for (const term of BANNED_TERMS) {
        expect(lower).not.toContain(term);
      }
    }
  });
});

describe('pickLine', () => {
  it('is deterministic', () => {
    for (const context of CONTEXTS) {
      expect(pickLine(context, 1)).toBe(pickLine(context, 1));
      expect(pickLine(context, 7)).toBe(BIT_LINES[context][7 % BIT_LINES[context].length]);
    }
  });

  it('wraps around the list', () => {
    for (const context of CONTEXTS) {
      const lines = BIT_LINES[context];

      expect(pickLine(context, lines.length)).toBe(lines[0]);
      expect(pickLine(context, lines.length + 1)).toBe(lines[1]);
      expect(pickLine(context, lines.length * 3 + 2)).toBe(lines[2]);
    }
  });

  it('uses the absolute value for negative numbers', () => {
    for (const context of CONTEXTS) {
      const lines = BIT_LINES[context];

      expect(pickLine(context, -1)).toBe(lines[1]);
      expect(pickLine(context, -lines.length - 2)).toBe(lines[2]);
    }
  });
});
