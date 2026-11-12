import { SaveV1Schema, type SaveV1 } from './schema';

export const CURRENT_SCHEMA_VERSION = 1;

export type Migration = (raw: Record<string, unknown>) => unknown;
export type Migrations = Record<number, Migration>;

/** Ladder of schema upgrades. A key holds the migration out of that version. */
export const MIGRATIONS: Migrations = {};

export type MigrationResult =
  | { ok: true; save: SaveV1; migrated: boolean }
  | { ok: false; reason: 'corrupt' | 'newer' };

const MAX_MIGRATION_STEPS = 100;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function corrupt(): MigrationResult {
  return { ok: false, reason: 'corrupt' };
}

export function migrate(
  raw: unknown,
  migrations: Migrations = MIGRATIONS,
): MigrationResult {
  if (!isRecord(raw)) return corrupt();

  const initialVersion = raw.schemaVersion;
  if (typeof initialVersion !== 'number' || !Number.isInteger(initialVersion)) {
    return corrupt();
  }
  if (initialVersion < 0) return corrupt();
  if (initialVersion > CURRENT_SCHEMA_VERSION) {
    return { ok: false, reason: 'newer' };
  }

  let value: unknown = raw;
  let version = initialVersion;
  let migrated = false;
  let steps = 0;

  while (version < CURRENT_SCHEMA_VERSION) {
    const migration = migrations[version];
    if (!migration || steps >= MAX_MIGRATION_STEPS) return corrupt();

    value = migration(value as Record<string, unknown>);
    if (!isRecord(value)) return corrupt();

    const nextVersion = value.schemaVersion;
    if (
      typeof nextVersion !== 'number' ||
      !Number.isInteger(nextVersion) ||
      nextVersion <= version
    ) {
      return corrupt();
    }

    version = nextVersion;
    migrated = true;
    steps += 1;
  }

  if (version !== CURRENT_SCHEMA_VERSION) return corrupt();

  const parsed = SaveV1Schema.safeParse(value);
  if (!parsed.success) return corrupt();

  return { ok: true, save: parsed.data, migrated };
}
