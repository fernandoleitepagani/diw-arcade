import { describe, expect, it } from 'vitest';
import { NODES, type NodeId } from '../../content';
import type { ProgressContent } from '../../lib/progress/events';
import {
  SaveV1Schema,
  createEmptySave,
  type SaveV1,
} from '../../lib/storage';
import { FIXED_NOW } from '../../test/renderWithProgress';
import { buildTrail } from './trailModel';

const fake = (id: string) => [{ id }] as never;
const CONTENT: ProgressContent = {
  questions: Object.fromEntries(NODES.map((n) => [n.id, fake(`${n.id}-q001`)])),
  flashcards: Object.fromEntries(NODES.map((n) => [n.id, fake(`${n.id}-f001`)])),
  challenges: Object.fromEntries(NODES.map((n) => [n.id, fake(`${n.id}-c001`)])),
};

const FAR = '2099-01-01T00:00:00.000Z';
const card = (due: string, reps = 1) => ({
  due,
  stability: 1,
  difficulty: 1,
  elapsedDays: 0,
  scheduledDays: 1,
  learningSteps: 0,
  reps,
  lapses: 0,
  state: 2 as const,
  lastReview: null,
});

function saveWith(mastered: readonly NodeId[], extra: Partial<SaveV1> = {}) {
  const rounds: SaveV1['quiz']['rounds'] = {};
  const cards: SaveV1['cards'] = {};
  const challenges: SaveV1['challenges'] = {};
  for (const id of mastered) {
    rounds[id] = { best: 100, count: 1, perfect: true };
    cards[`${id}-f001`] = card(FAR);
    challenges[`${id}-c001`] = {
      passed: true,
      failedRuns: 0,
      hintsUsed: 0,
      xpAwarded: 0,
      code: null,
    };
  }
  const base = createEmptySave(FIXED_NOW);
  return SaveV1Schema.parse({
    ...base,
    onboarded: true,
    quiz: { ...base.quiz, rounds },
    cards: { ...cards, ...extra.cards },
    challenges,
  });
}

const idsOf = (nodeIds: readonly string[]) => nodeIds as readonly NodeId[];
const nodesOfUnits = (units: string[]) =>
  NODES.filter((n) => units.includes(n.unitId)).map((n) => n.id);

describe('buildTrail', () => {
  it('fresh save: six units, u1 current, 20 nodes numbered 01 to 20', () => {
    const trail = buildTrail(saveWith([]), CONTENT, FIXED_NOW);

    expect(trail.map((u) => u.unitId)).toEqual(['u1', 'u2', 'u3', 'u4', 'u5', 'u6']);
    expect(trail.filter((u) => u.current).map((u) => u.unitId)).toEqual(['u1']);
    const nodes = trail.flatMap((u) => u.nodes);
    expect(nodes.map((n) => n.number)).toEqual(
      Array.from({ length: 20 }, (_, i) => String(i + 1).padStart(2, '0')),
    );
    expect(nodes.every((n) => n.state === 'nova')).toBe(true);
    expect(nodes.filter((n) => n.recommended).map((n) => n.id)).toEqual(['n01']);
    expect(trail.some((u) => u.finished)).toBe(false);
  });

  it('finished units are flagged and the current unit moves on', () => {
    const save = saveWith(idsOf(nodesOfUnits(['u1', 'u2'])));
    const trail = buildTrail(save, CONTENT, FIXED_NOW);

    expect(trail.map((u) => u.finished)).toEqual([true, true, false, false, false, false]);
    expect(trail.find((u) => u.current)?.unitId).toBe('u3');
    expect(trail[0]!.nodes.every((n) => n.state === 'dominada')).toBe(true);
  });

  it('when everything is dominada only the last unit is current', () => {
    const save = saveWith(idsOf(NODES.map((n) => n.id)));
    const trail = buildTrail(save, CONTENT, FIXED_NOW);

    expect(trail.every((u) => u.finished)).toBe(true);
    expect(trail.filter((u) => u.current).map((u) => u.unitId)).toEqual(['u6']);
  });

  it('current follows the recommendation even when an earlier unit is unfinished', () => {
    const cards = { 'n13-f001': card(FIXED_NOW.toISOString()) };
    const save = saveWith(idsOf(nodesOfUnits(['u1', 'u2'])), { cards });
    const trail = buildTrail(save, CONTENT, FIXED_NOW);

    expect(trail.find((u) => u.current)?.unitId).toBe('u5');
    const u5 = trail.find((u) => u.unitId === 'u5')!;
    expect(u5.nodes.find((n) => n.recommended)?.id).toBe('n13');
    expect(trail.find((u) => u.unitId === 'u3')!.current).toBe(false);
  });
});
