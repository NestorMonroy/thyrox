# How OmniRoute versions its SQLite schema, and what it means for #289

Source: `github.com/diegosouzapw/OmniRoute` at `a58000c7` (the commit the earlier ports used),
restored read-only at `/home/user/nestormonroy/omniroute`. Files: `src/lib/db/core.ts`,
`src/lib/db/migrationRunner.ts` (1200 lines), `src/lib/db/migrationRunner/*`,
`src/lib/db/migrations/*.sql` (190 files), `src/lib/db/AGENTS.md`.

## What OmniRoute does

| Aspect | OmniRoute |
|---|---|
| Owner | One runner, in one language. Several SQLite drivers (better-sqlite3, node:sqlite, bun:sqlite, sql.js) sit behind one `SqliteAdapter` (`adapters/driverFactory.ts`), but they all run the same `runMigrations`. Several hosts share the file; there is still one executor of the history. |
| Ledger | `_omniroute_migrations (version TEXT PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL DEFAULT (datetime('now')))`. Carries the migration **name**, not only its number. |
| Base schema | `core.ts` runs `SCHEMA_SQL` (`CREATE TABLE IF NOT EXISTS`, 17 base tables) and then `runMigrations`. |
| Migrations | Numbered `NNN_description.sql` files, one transaction per file. |
| Adopting old databases | `isSchemaAlreadyApplied(migration)`: per version, detect whether the change is already there (`hasColumn(...)`, table exists) and record it as applied without running it. |
| Provenance | `validateRequiredPhysicalMigrationProvenance`: a version recorded under another name is refused ("recorded as unknown migration ... instead of ..."); renumbered and superseded duplicate migrations are handled by explicit tables (`migrationRunner/constants.ts`). |
| Safety | Pre-migration snapshot of an existing database (`preMigrationBackup.ts`), and it refuses to migrate without a durable snapshot; aborts when too many migrations are pending on an existing database (a sign it was wiped or restored); plans under an IMMEDIATE writer lock; when nothing is pending it takes the read-only path with no writer lock. |
| What it does not face | Two languages writing the same file. |

## Mapping to #289

- OmniRoute's shape is Option 1: one executor, a ledger every host reads. In thyrox the
  executor would be Python, which already evolves `agent_store.sqlite3`; Bun is a host
  that reads the ledger and refuses on a version it does not know.
- Python's current detection migrations (`_migrate_*` in `connect()`) are exactly
  OmniRoute's `isSchemaAlreadyApplied` pattern. They become numbered versions whose
  adoption check is the detection that already exists.
- Four OmniRoute guarantees that the A0 contract does not have today:
  1. a `name` column in the ledger, with the version+name provenance check;
  2. a snapshot before migrating an existing database;
  3. an abort when too many migrations are pending on an existing database;
  4. a no-op path with no writer lock when nothing is pending.
  The first changes the observable contract of both runners (A0 is already committed with
  `version, applied_at` only), so it needs the executor's decision.
- Not applicable as-is: the snapshot policy. `agent_store.sqlite3` is versioned in git, so git
  already keeps prior states; a snapshot would guard only uncommitted changes.
