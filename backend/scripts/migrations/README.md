# Database Migrations

Versioned database migrations for the WhatsApp-First Business Finance Assistant backend.

## Structure

Each migration is a TypeScript file in this directory named with a numeric prefix:

```
001-add-indexes.ts
002-add-field.ts
...
```

Every migration must export two functions:

```ts
export async function up(db: Db): Promise<void> {
  // Apply the migration
}

export async function down(db: Db): Promise<void> {
  // Rollback the migration
}
```

The `db` parameter is the raw `mongodb.Db` instance from the Mongoose connection.

## Running Migrations

```bash
npx tsx scripts/migrations/run.ts <migration-name>
```

- `npx tsx scripts/migrations/run.ts 001-add-indexes` — apply migration
- `npx tsx scripts/migrations/run.ts 001-add-indexes --down` — rollback migration
- `npx tsx scripts/migrations/run.ts 001-add-indexes --down --force` — force destructive rollback without confirmation prompt

## Tracking

Applied migrations are recorded in a `migrations` collection in MongoDB:

```json
{
  "name": "001-add-indexes",
  "appliedAt": "2026-08-17T12:00:00.000Z",
  "rollbackAvailable": true
}
```

The runner will refuse to apply a migration that has already been recorded, and will refuse to roll back a migration that hasn't been applied.

## Destructive Migrations

Migrations that drop collections, remove fields, or delete data should:

1. Export `const destructive = true;`
2. Require the `--force` flag when rolling back
3. Print a clear warning before executing

## Guidelines

- Migrations must be **idempotent** when possible — re-running a completed migration should not fail or create duplicates.
- Prefer additive changes (new indexes, new fields with defaults) over destructive ones.
- Test each migration against a staging database before applying to production.
- Never modify an already-applied migration file. Create a new migration instead.
