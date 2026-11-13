# ADR-0002 — Progress storage, migrations, export/import

- Status: accepted
- Date: 2026-11-12

## Context

DIW Arcade is a local-only, static SPA. Progress is small (XP, day counters,
quiz answers, SRS cards, lab checklists, achievements) and every game action
reads and writes it synchronously. There is no backend, account or network
call, so the browser is the only source of truth. Students upgrade the site
over a semester, and a save written by one build must keep working in the next
one. A broken schema change would erase a student's progress, which is the
failure mode this decision guards against.

## Decision

### Local-only, single key

Progress lives in one `localStorage` key, `diw-arcade:save`, as JSON produced
from the zod `SaveV2Schema` (current schema version 2). The exported type keeps the name `SaveV1` and `SaveV1Schema` stays as an alias, an expand-contract step so existing references compile unchanged. There is no IndexedDB, no cookie, no server and
no sync. Reading is synchronous, which keeps the reducer and provider simple.
`src/lib/storage` is the only module allowed to touch storage globals; ESLint
enforces that boundary.

### Migration ladder

- `CURRENT_SCHEMA_VERSION` is the version this build writes.
- `MIGRATIONS` is keyed by the version a migration leaves behind: a key `N` is
  `(raw) => raw with schemaVersion N + 1`.
- `migrate` walks the ladder from the stored version to the current version,
  applying exactly one step per version. A step must move the version forward;
  a missing step, invalid value or a migration that overshoots the current
  version is treated as corrupt.
- A save with a version greater than `CURRENT_SCHEMA_VERSION` is "newer": this
  build cannot understand it and must not silently downgrade it.

- `MIGRATIONS[1]` (v1 to v2) adds `primersRead: {}` (node id to ISO read time)
  and bumps the version, copying every other key untouched. `migrate` validates
  against the current schema at the end; any failure is corrupt, never partial.
- When `loadSave` migrates, it first writes the raw pre-migration JSON to
  `diw-arcade:save:backup:<ISO timestamp>` (best effort, a quota failure is
  ignored), never removes `diw-arcade:save`, and returns `recovered: "migrated"`.

### Defaults for additive fields

Fields added within a version are additive and carry zod defaults, so a save
missing them loads without a migration (`loaded`). Adding a field that changes
the schema version still gets a migration step. The defaults are:

- `onboarded: false`;
- `settings.dailyGoal: 50`, `settings.sound: false`,
  `settings.newCardsPerDay: 20`, `settings.reviewsPerDay: 100`;
- `days: {}`, `cards: {}`, `introduced: {}`, `labs: {}`, `reviews: []`,
  `challenges: {}`, `achievements: {}`;
- each `days.<day>` entry fills `xp`, `quiz`, `cards`, `challenges` and `labs`
  with `0`;
- `quiz: { answers: {}, rounds: {} }`;
- `primersRead: {}` (v2).

Top-level objects use `z.prefault({})` rather than `z.default({})` so the
nested defaults are applied even when the whole object is absent.

A change that is not additive (rename, type change, semantic change) gets a
migration step in `MIGRATIONS`; defaults are only for new fields.

### Backup policy

Corrupt or newer raw values are copied to
`diw-arcade:save:backup:<ISO timestamp>` before the main key is discarded, and
`loadSave` returns a fresh empty save with `recovered: "corrupt"` or `"newer"`.
The backup write happens first. If it fails (for example
`QuotaExceededError`), the original value stays in `diw-arcade:save` so no data
is lost, and the call still returns instead of throwing. Backups are never
read automatically; they exist for manual recovery.

A quota failure on a normal write makes `persistSave` return `{ ok: false }`.
Storage errors never escape as exceptions; the UI decides how to warn.

### Export and import

`exportSave(save, now)` produces:

```json
{ "app": "diw-arcade", "schemaVersion": 2, "exportedAt": "<ISO>", "save": { ... } }
```

`parseImport(text)` accepts that envelope, caps the input at 5 MB, and rejects
invalid JSON, an envelope whose `app` is not `diw-arcade`, and a `save` that
fails `migrate` (corrupt or newer) with PT-BR messages. A v1 export is migrated
to v2 on import. Import never writes storage; the
caller confirms and dispatches the replacement.

## Consequences

- A missing or corrupt save always yields a usable empty save; the user can
  keep practising instead of hitting a blank screen.
- Newer saves are preserved in a backup but not used by an older build.
- Every non-additive schema change must ship with a migration step and a test;
  review treats `src/lib/storage/**` as a risk path.
- `localStorage` quotas (about 5 MB per origin) bound the save. The progress
  reducer caps the review log at 5000 entries; the schema accepts a longer log
  rather than discarding an otherwise valid save.
