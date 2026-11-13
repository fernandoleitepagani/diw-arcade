import { describe, expect, it } from 'vitest';
import { resolveHome } from './resolveHome';

describe('resolveHome', () => {
  const table = [
    { onboarded: false, forceLanding: false, expected: 'landing' },
    { onboarded: false, forceLanding: true, expected: 'landing' },
    { onboarded: true, forceLanding: false, expected: 'hoje' },
    { onboarded: true, forceLanding: true, expected: 'landing' },
  ] as const;

  for (const { onboarded, forceLanding, expected } of table) {
    it(`onboarded=${onboarded} forceLanding=${forceLanding} -> ${expected}`, () => {
      expect(resolveHome({ onboarded, forceLanding })).toBe(expected);
    });
  }
});
