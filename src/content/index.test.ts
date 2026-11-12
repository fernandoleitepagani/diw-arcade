import { describe, expect, it } from 'vitest';
import {
  buildContentIndex,
  getChallenge,
  getFlashcards,
  getNode,
  getQuestions,
  NODE_IDS,
} from './index';
import {
  fixtureChallenge,
  fixtureContent,
  fixtureFlashcards,
  fixtureLab,
  fixtureQuestions,
} from '../test/fixtures';

describe('buildContentIndex', () => {
  it('groups node files by node and lab guides by id', () => {
    const index = buildContentIndex(fixtureContent);

    expect(index.questions.n07).toHaveLength(fixtureQuestions.length);
    expect(index.flashcards.n07).toHaveLength(fixtureFlashcards.length);
    expect(index.challenges.n07).toEqual([fixtureChallenge]);
    expect(index.labs['lab-01']).toEqual(fixtureLab);
    expect(index.questions.n01).toEqual([]);
  });

  it('accepts glob-style relative paths', () => {
    const index = buildContentIndex({
      './n07/questions.json': fixtureQuestions,
    });

    expect(index.questions.n07).toHaveLength(fixtureQuestions.length);
  });

  it('ignores unknown module paths', () => {
    const index = buildContentIndex({ './README.md': 'nada' });

    expect(index.questions.n07).toEqual([]);
    expect(index.labs['lab-01']).toBeUndefined();
  });

  it('throws on invalid content instead of silently dropping it', () => {
    expect(() =>
      buildContentIndex({ './n07/questions.json': [{ id: 'inválido' }] }),
    ).toThrow(/Conteúdo inválido em/);
  });
});

describe('content helpers', () => {
  it('returns the tree metadata for a node', () => {
    expect(getNode('n07')).toMatchObject({
      id: 'n07',
      title: 'Propriedades CSS',
      aulas: [172],
    });
    expect(getNode('n06')?.aulas).toEqual([170, 171]);
  });

  it('returns arrays for every node, even when the repo has no JSON yet', () => {
    for (const nodeId of NODE_IDS) {
      expect(Array.isArray(getQuestions(nodeId))).toBe(true);
      expect(Array.isArray(getFlashcards(nodeId))).toBe(true);
    }
  });

  it('returns undefined for unknown ids', () => {
    expect(getChallenge('n99-c01')).toBeUndefined();
  });
});
