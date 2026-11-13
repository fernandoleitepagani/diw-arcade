import { MIGRATIONS, migrate, type Migrations } from './migrate';
import { SaveV2Schema, type SaveV1 } from './schema';

export const SAVE_KEY = 'diw-arcade:save';
export const BACKUP_PREFIX = 'diw-arcade:save:backup:';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type Recovered = 'fresh' | 'loaded' | 'migrated' | 'corrupt' | 'newer';

export interface LoadResult {
  save: SaveV1;
  recovered: Recovered;
}

export interface PersistResult {
  ok: boolean;
}

export function backupKey(now: Date): string {
  return `${BACKUP_PREFIX}${now.toISOString()}`;
}

export function createEmptySave(now: Date): SaveV1 {
  return SaveV2Schema.parse({
    schemaVersion: 2,
    createdAt: now.toISOString(),
    xpTotal: 0,
  });
}

function read(store: StorageLike): string | null {
  try {
    return store.getItem(SAVE_KEY);
  } catch {
    return null;
  }
}

function backUp(store: StorageLike, raw: string, now: Date): boolean {
  try {
    store.setItem(backupKey(now), raw);
    return true;
  } catch {
    return false;
  }
}

function discard(store: StorageLike): void {
  try {
    store.removeItem(SAVE_KEY);
  } catch {
    // The save is already safe in the backup or unreadable; nothing else to do.
  }
}

export function loadSave(
  store: StorageLike,
  now: Date,
  migrations: Migrations = MIGRATIONS,
): LoadResult {
  const raw = read(store);
  if (raw === null) {
    return { save: createEmptySave(now), recovered: 'fresh' };
  }

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    if (backUp(store, raw, now)) discard(store);
    return { save: createEmptySave(now), recovered: 'corrupt' };
  }

  const result = migrate(value, migrations);
  if (!result.ok) {
    if (backUp(store, raw, now)) discard(store);
    return { save: createEmptySave(now), recovered: result.reason };
  }

  if (result.migrated) {
    // Best effort: keep the pre-migration JSON; SAVE_KEY is never removed here.
    backUp(store, raw, now);
    return { save: result.save, recovered: 'migrated' };
  }

  return { save: result.save, recovered: 'loaded' };
}

export function persistSave(store: StorageLike, save: SaveV1): PersistResult {
  try {
    store.setItem(SAVE_KEY, JSON.stringify(save));
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
