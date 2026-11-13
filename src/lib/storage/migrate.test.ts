import { describe, expect, it } from 'vitest';
import { migrate, MIGRATIONS, type Migrations } from './migrate';

const CREATED_AT = '2026-01-04T09:00:00.000Z';
const BASE = { schemaVersion: 1, createdAt: CREATED_AT, xpTotal: 0 };

describe('migrate', () => {
  it('accepts a current v2 save without running migrations', () => {
    const result = migrate({ ...BASE, schemaVersion: 2 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.migrated).toBe(false);
    expect(result.save.xpTotal).toBe(0);
    expect(result.save.settings.newCardsPerDay).toBe(20);
  });

  it('applies injected migrations in order', () => {
    const migrations: Migrations = {
      0: (raw) => ({ ...raw, schemaVersion: 1, xpTotal: 10 }),
      1: (raw) => ({ ...raw, schemaVersion: 2 }),
    };

    const result = migrate({ ...BASE, schemaVersion: 0 }, migrations);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.migrated).toBe(true);
    expect(result.save.xpTotal).toBe(10);
  });

  it('applies each migration exactly once', () => {
    let calls = 0;
    const migrations: Migrations = {
      0: (raw) => {
        calls += 1;
        return { ...raw, schemaVersion: 1, xpTotal: 99 };
      },
      1: (raw) => ({ ...raw, schemaVersion: 2 }),
    };

    const result = migrate({ ...BASE, schemaVersion: 0 }, migrations);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.migrated).toBe(true);
    expect(result.save.xpTotal).toBe(99);
    expect(calls).toBe(1);
  });

  it('rejects an old save with no migration available', () => {
    expect(migrate({ ...BASE, schemaVersion: 0 }, {})).toEqual({
      ok: false,
      reason: 'corrupt',
    });
  });

  it('rejects a migration that does not move the version forward', () => {
    const migrations: Migrations = { 0: (raw) => raw };

    expect(migrate({ ...BASE, schemaVersion: 0 }, migrations)).toEqual({
      ok: false,
      reason: 'corrupt',
    });
  });

  it('rejects a migration that skips past the current version', () => {
    const migrations: Migrations = {
      0: (raw) => ({ ...raw, schemaVersion: 3 }),
    };

    expect(migrate({ ...BASE, schemaVersion: 0 }, migrations)).toEqual({
      ok: false,
      reason: 'corrupt',
    });
  });

  it('reports a save from a newer app version', () => {
    expect(migrate({ ...BASE, schemaVersion: 3 })).toEqual({
      ok: false,
      reason: 'newer',
    });
  });

  it('rejects values that are not a save object', () => {
    expect(migrate(null)).toEqual({ ok: false, reason: 'corrupt' });
    expect(migrate([])).toEqual({ ok: false, reason: 'corrupt' });
    expect(migrate('save')).toEqual({ ok: false, reason: 'corrupt' });
  });

  it('rejects a missing or invalid schemaVersion', () => {
    expect(migrate({ createdAt: CREATED_AT, xpTotal: 0 })).toEqual({
      ok: false,
      reason: 'corrupt',
    });
    expect(migrate({ ...BASE, schemaVersion: '1' })).toEqual({
      ok: false,
      reason: 'corrupt',
    });
  });

  it('rejects a save that fails the schema after migrating', () => {
    const migrations: Migrations = {
      0: (raw) => ({ ...raw, schemaVersion: 1, xpTotal: -1 }),
      1: (raw) => ({ ...raw, schemaVersion: 2 }),
    };

    expect(migrate({ ...BASE, schemaVersion: 0 }, migrations)).toEqual({
      ok: false,
      reason: 'corrupt',
    });
  });
});

const V1_FULL = {
  schemaVersion: 1,
  createdAt: CREATED_AT,
  onboarded: true,
  xpTotal: 340,
  days: { '2026-01-05': { xp: 15, quiz: 1, cards: 2, challenges: 1, labs: 1 } },
  settings: { dailyGoal: 100, sound: true, newCardsPerDay: 30, reviewsPerDay: 150 },
  quiz: {
    answers: { q1: { seen: 3, correct: 2, lastCorrect: true } },
    rounds: { n01: { best: 4, count: 2, perfect: false } },
  },
  cards: {
    'n01-f001': {
      due: '2026-01-06T12:00:00.000Z',
      stability: 0.4,
      difficulty: 5,
      elapsedDays: 0,
      scheduledDays: 0,
      learningSteps: 1,
      reps: 1,
      lapses: 0,
      state: 1,
      lastReview: '2026-01-05T12:00:00.000Z',
    },
  },
  introduced: { 'n01-f001': '2026-01-05' },
  reviews: [{ cardId: 'n01-f001', grade: 3, at: '2026-01-05T12:00:00.000Z' }],
  challenges: {
    c1: {
      passed: true,
      failedRuns: 1,
      hintsUsed: 2,
      xpAwarded: 30,
      code: { html: '<p>', css: 'p{}', js: '' },
    },
  },
  labs: { 'lab-01': { 'passo-1': { done: true, xpAwarded: true } } },
  achievements: { first: '2026-01-05T12:00:00.000Z' },
};

describe('migrate v1 to v2', () => {
  it('has a v1 step in the ladder', () => {
    expect(typeof MIGRATIONS[1]).toBe('function');
  });

  it('keeps every v1 key untouched and adds an empty primersRead', () => {
    const result = migrate(structuredClone(V1_FULL));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.migrated).toBe(true);
    expect(result.save).toEqual({ ...V1_FULL, schemaVersion: 2, primersRead: {} });
  });

  it('preserves onboarded: false', () => {
    const result = migrate({ ...structuredClone(V1_FULL), onboarded: false });

    expect(result.ok && result.save.onboarded).toBe(false);
  });

  it('does not re-migrate a v2 save', () => {
    const v2 = { ...V1_FULL, schemaVersion: 2, primersRead: { n01: CREATED_AT } };

    const result = migrate(structuredClone(v2));

    expect(result.ok && result.migrated).toBe(false);
    expect(result.ok && result.save).toEqual(v2);
  });

  it('defaults a missing primersRead under v2', () => {
    const result = migrate({ ...BASE, schemaVersion: 2 });

    expect(result.ok && result.save.primersRead).toEqual({});
  });

  it('reports version 3 as newer', () => {
    expect(migrate({ ...V1_FULL, schemaVersion: 3 })).toEqual({
      ok: false,
      reason: 'newer',
    });
  });

  it('rejects version 0 and "1" as corrupt', () => {
    expect(migrate({ ...V1_FULL, schemaVersion: 0 })).toEqual({ ok: false, reason: 'corrupt' });
    expect(migrate({ ...V1_FULL, schemaVersion: '1' })).toEqual({ ok: false, reason: 'corrupt' });
  });

  it('treats an invalid v1 field as corrupt, not partial', () => {
    expect(migrate({ ...V1_FULL, xpTotal: -1 })).toEqual({ ok: false, reason: 'corrupt' });
  });

  it('is idempotent when fed its own output', () => {
    const first = migrate(structuredClone(V1_FULL));
    if (!first.ok) throw new Error('migration failed');

    const second = migrate(structuredClone(first.save));

    expect(second.ok && second.migrated).toBe(false);
    expect(second.ok && second.save).toEqual(first.save);
  });
});
