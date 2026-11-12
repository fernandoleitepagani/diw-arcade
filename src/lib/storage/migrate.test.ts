import { describe, expect, it } from 'vitest';
import { migrate, type Migrations } from './migrate';

const CREATED_AT = '2026-01-04T09:00:00.000Z';
const BASE = { schemaVersion: 1, createdAt: CREATED_AT, xpTotal: 0 };

describe('migrate', () => {
  it('accepts a current v1 save without running migrations', () => {
    const result = migrate(BASE);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.migrated).toBe(false);
    expect(result.save.xpTotal).toBe(0);
    expect(result.save.settings.newCardsPerDay).toBe(20);
  });

  it('applies injected migrations in order', () => {
    const migrations: Migrations = {
      0: (raw) => ({ ...raw, schemaVersion: 1, xpTotal: 10 }),
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
      0: (raw) => ({ ...raw, schemaVersion: 2 }),
    };

    expect(migrate({ ...BASE, schemaVersion: 0 }, migrations)).toEqual({
      ok: false,
      reason: 'corrupt',
    });
  });

  it('reports a save from a newer app version', () => {
    expect(migrate({ ...BASE, schemaVersion: 2 })).toEqual({
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
    };

    expect(migrate({ ...BASE, schemaVersion: 0 }, migrations)).toEqual({
      ok: false,
      reason: 'corrupt',
    });
  });
});
