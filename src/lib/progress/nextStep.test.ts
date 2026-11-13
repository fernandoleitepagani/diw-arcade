import { describe, expect, it } from 'vitest';
import { newCard } from '../srs/fsrs';
import { createEmptySave } from '../storage';
import type { ProgressContent } from './events';
import { getNextStep } from './nextStep';

const NOW = new Date('2026-01-05T12:00:00.000Z');

const CONTENT: ProgressContent = {
  questions: { n01: [{ id: 'n01-q001' }], n02: [{ id: 'n02-q001' }] },
  flashcards: { n01: [{ id: 'n01-f001' }], n02: [{ id: 'n02-f001' }] },
  challenges: { n01: [{ id: 'n01-c01' }], n02: [{ id: 'n02-c01' }] },
};

function withDueCard() {
  const save = createEmptySave(NOW);
  save.cards['n01-f001'] = {
    ...newCard(NOW),
    due: new Date(NOW.getTime() - 60_000).toISOString(),
    reps: 1,
    state: 2,
  };
  return save;
}

describe('getNextStep', () => {
  it('puts due cards first and points at /revisao', () => {
    const next = getNextStep(withDueCard(), CONTENT, NOW);

    expect(next.primary.href).toBe('/revisao');
    expect(next.primary.label).toBe('Revisar 1 carta');
    expect(next.goal).toMatch(/revis/i);
  });

  it('offers the node step as an alternate when cards are due', () => {
    const next = getNextStep(withDueCard(), CONTENT, NOW);

    expect(next.alternates.map((a) => a.href)).toContain(
      '/no/n01?passo=praticar',
    );
  });

  it('falls to the first unfinished step of the current node', () => {
    const next = getNextStep(createEmptySave(NOW), CONTENT, NOW);

    expect(next.primary.href).toBe('/no/n01?passo=praticar');
    expect(next.primary.nodeId).toBe('n01');
    expect(next.primary.unitId).toBe('u1');
  });

  it('keeps 1 to 3 distinct alternates that never repeat the primary', () => {
    const next = getNextStep(createEmptySave(NOW), CONTENT, NOW);

    expect(next.alternates.length).toBeGreaterThanOrEqual(1);
    expect(next.alternates.length).toBeLessThanOrEqual(3);
    const hrefs = [next.primary, ...next.alternates].map((a) => a.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it('writes the goal as one PT-BR sentence without middle dots', () => {
    const next = getNextStep(createEmptySave(NOW), CONTENT, NOW);

    expect(next.goal.endsWith('.')).toBe(true);
    expect(next.goal).not.toContain('·');
  });

  it('falls back to /trilha when there is no content', () => {
    const next = getNextStep(createEmptySave(NOW), { }, NOW);

    expect(next.primary.href).toBe('/trilha');
  });
});
