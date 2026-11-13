import { describe, expect, it } from 'vitest';
import {
  BACKUP_PREFIX,
  SAVE_KEY,
  createEmptySave,
  loadSave,
  persistSave,
  type StorageLike,
} from './storage';

const NOW = new Date('2026-01-05T12:00:00.000Z');
const CREATED_AT = '2026-01-04T09:00:00.000Z';

class MemoryStorage implements StorageLike {
  private readonly data = new Map<string, string>();

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  keys(): string[] {
    return [...this.data.keys()];
  }

  backupValues(): string[] {
    return this.keys()
      .filter((key) => key.startsWith(BACKUP_PREFIX))
      .map((key) => this.data.get(key) ?? '');
  }
}

function minimalSave(): Record<string, unknown> {
  return { schemaVersion: 1, createdAt: CREATED_AT, xpTotal: 0 };
}

describe('loadSave', () => {
  it('starts a fresh save when nothing is stored', () => {
    const store = new MemoryStorage();

    const result = loadSave(store, NOW);

    expect(result.recovered).toBe('fresh');
    expect(result.save.onboarded).toBe(false);
    expect(result.save.xpTotal).toBe(0);
    expect(result.save.settings).toEqual({
      dailyGoal: 50,
      sound: false,
      newCardsPerDay: 20,
      reviewsPerDay: 100,
    });
    expect(result.save.days).toEqual({});
    expect(result.save.cards).toEqual({});
    expect(result.save.introduced).toEqual({});
    expect(result.save.labs).toEqual({});
  });

  it('loads a valid v2 save', () => {
    const store = new MemoryStorage();
    const save = createEmptySave(NOW);
    save.onboarded = true;
    save.xpTotal = 250;
    save.introduced = { 'n01-f001': '2026-01-05' };
    save.labs = { 'lab-01': { 'passo-1': { done: true, xpAwarded: true } } };
    save.days = {
      '2026-01-05': { xp: 15, quiz: 1, cards: 0, challenges: 0, labs: 1 },
    };
    save.cards = {
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
    };
    store.setItem(SAVE_KEY, JSON.stringify(save));

    const result = loadSave(store, NOW);

    expect(result.recovered).toBe('loaded');
    expect(result.save).toEqual(save);
  });

  it('fills additive defaults for an older v1 save', () => {
    const store = new MemoryStorage();
    store.setItem(
      SAVE_KEY,
      JSON.stringify({
        ...minimalSave(),
        days: { '2026-01-05': { xp: 10 } },
      }),
    );

    const result = loadSave(store, NOW);

    expect(result.recovered).toBe('migrated');
    expect(result.save.onboarded).toBe(false);
    expect(result.save.settings.newCardsPerDay).toBe(20);
    expect(result.save.settings.reviewsPerDay).toBe(100);
    expect(result.save.introduced).toEqual({});
    expect(result.save.labs).toEqual({});
    expect(result.save.days['2026-01-05']).toEqual({
      xp: 10,
      quiz: 0,
      cards: 0,
      challenges: 0,
      labs: 0,
    });
  });

  it('runs an injected migration and reports it as migrated', () => {
    const store = new MemoryStorage();
    const older = { ...minimalSave(), schemaVersion: 0 };
    store.setItem(SAVE_KEY, JSON.stringify(older));

    const result = loadSave(store, NOW, {
      0: (raw) => ({ ...raw, schemaVersion: 1, xpTotal: 42 }),
      1: (raw) => ({ ...raw, schemaVersion: 2 }),
    });

    expect(result.recovered).toBe('migrated');
    expect(result.save.xpTotal).toBe(42);
  });

  it('backs up a corrupt save and returns a fresh one', () => {
    const store = new MemoryStorage();
    const raw = '{ not json';
    store.setItem(SAVE_KEY, raw);

    const result = loadSave(store, NOW);

    expect(result.recovered).toBe('corrupt');
    expect(result.save.xpTotal).toBe(0);
    expect(store.backupValues()).toEqual([raw]);
    expect(store.getItem(SAVE_KEY)).toBeNull();
  });

  it('backs up a valid JSON save that violates the schema', () => {
    const store = new MemoryStorage();
    const raw = JSON.stringify({ ...minimalSave(), xpTotal: -5 });
    store.setItem(SAVE_KEY, raw);

    const result = loadSave(store, NOW);

    expect(result.recovered).toBe('corrupt');
    expect(store.backupValues()).toEqual([raw]);
  });

  it('backs up a newer save and starts fresh', () => {
    const store = new MemoryStorage();
    const raw = JSON.stringify({ ...minimalSave(), schemaVersion: 3 });
    store.setItem(SAVE_KEY, raw);

    const result = loadSave(store, NOW);

    expect(result.recovered).toBe('newer');
    expect(result.save.schemaVersion).toBe(2);
    expect(store.backupValues()).toEqual([raw]);
  });

  it('does not throw when the backup write hits the quota', () => {
    let removed = false;
    const store: StorageLike = {
      getItem: () => '{ not json',
      setItem: () => {
        throw new DOMException('cheio', 'QuotaExceededError');
      },
      removeItem: () => {
        removed = true;
      },
    };

    expect(() => loadSave(store, NOW)).not.toThrow();
    expect(loadSave(store, NOW).recovered).toBe('corrupt');
    expect(removed).toBe(false);
  });
});

describe('loadSave v1 migration', () => {
  const v1Raw = () => JSON.stringify({ ...minimalSave(), xpTotal: 77, onboarded: true });

  it('migrates a v1 string and backs up the raw v1 JSON', () => {
    const store = new MemoryStorage();
    const raw = v1Raw();
    store.setItem(SAVE_KEY, raw);

    const result = loadSave(store, NOW);

    expect(result.recovered).toBe('migrated');
    expect(result.save.schemaVersion).toBe(2);
    expect(result.save.primersRead).toEqual({});
    expect(result.save.xpTotal).toBe(77);
    expect(store.backupValues()).toEqual([raw]);
  });

  it('never deletes the main key', () => {
    const removed: string[] = [];
    const raw = v1Raw();
    const store: StorageLike = {
      getItem: () => raw,
      setItem: () => {},
      removeItem: (key) => {
        removed.push(key);
      },
    };

    loadSave(store, NOW);

    expect(removed).toEqual([]);
  });

  it('still returns the migrated save when the backup hits the quota', () => {
    const store: StorageLike = {
      getItem: () => v1Raw(),
      setItem: () => {
        throw new DOMException('cheio', 'QuotaExceededError');
      },
      removeItem: () => {},
    };

    const result = loadSave(store, NOW);

    expect(result.recovered).toBe('migrated');
    expect(result.save.xpTotal).toBe(77);
  });

  it('persists v2 for a fresh load', () => {
    const store = new MemoryStorage();

    const { save } = loadSave(store, NOW);
    persistSave(store, save);

    expect(JSON.parse(store.getItem(SAVE_KEY) ?? '{}').schemaVersion).toBe(2);
    expect(save.primersRead).toEqual({});
  });
});

describe('loadSave v1 migration persistence', () => {
  const v1Raw = () => JSON.stringify({ ...minimalSave(), xpTotal: 77 });

  it('writes one backup across repeated loads and loads v2 the second time', () => {
    const store = new MemoryStorage();
    store.setItem(SAVE_KEY, v1Raw());

    const first = loadSave(store, NOW);
    const second = loadSave(store, new Date(NOW.getTime() + 1000));

    expect(first.recovered).toBe('migrated');
    expect(second.recovered).toBe('loaded');
    expect(second.save).toEqual(first.save);
    expect(store.backupValues()).toEqual([v1Raw()]);
  });

  it('leaves SAVE_KEY untouched when the backup fails', () => {
    const raw = v1Raw();
    const writes: string[] = [];
    const store: StorageLike = {
      getItem: () => raw,
      setItem: (key) => {
        writes.push(key);
        throw new DOMException('cheio', 'QuotaExceededError');
      },
      removeItem: () => {},
    };

    const result = loadSave(store, NOW);

    expect(result.recovered).toBe('migrated');
    expect(writes.includes(SAVE_KEY)).toBe(false);
  });
});

describe('persistSave', () => {
  it('writes a save that a later load reads back', () => {
    const store = new MemoryStorage();
    const save = createEmptySave(NOW);
    save.onboarded = true;
    save.xpTotal = 80;

    expect(persistSave(store, save)).toEqual({ ok: true });
    expect(loadSave(store, NOW)).toEqual({ save, recovered: 'loaded' });
  });

  it('reports a quota failure instead of throwing', () => {
    const store: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException('cheio', 'QuotaExceededError');
      },
      removeItem: () => {},
    };

    expect(() => persistSave(store, createEmptySave(NOW))).not.toThrow();
    expect(persistSave(store, createEmptySave(NOW))).toEqual({ ok: false });
  });
});
