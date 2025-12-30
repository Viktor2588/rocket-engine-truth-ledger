/**
 * Database Migration Runner
 * Applies SQL migrations in order, tracking applied migrations
 */

import 'dotenv/config';
import { readdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getConnection, closeConnection } from './connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MIGRATIONS_DIR = join(__dirname, 'migrations');

interface Migration {
  name: string;
  sql: string;
}

interface AppliedMigration {
  id: number;
  name: string;
  applied_at: Date;
}

async function ensureMigrationsTable(): Promise<void> {
  const sql = getConnection();
  await sql`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

async function getAppliedMigrations(): Promise<Set<string>> {
  const sql = getConnection();
  const results = await sql<AppliedMigration[]>`
    SELECT name FROM migrations ORDER BY id
  `;
  return new Set(results.map(r => r.name));
}

async function loadMigrations(): Promise<Migration[]> {
  const files = await readdir(MIGRATIONS_DIR);
  const sqlFiles = files
    .filter(f => f.endsWith('.sql'))
    .sort();

  const migrations: Migration[] = [];
  for (const file of sqlFiles) {
    const content = await readFile(join(MIGRATIONS_DIR, file), 'utf-8');
    migrations.push({
      name: file,
      sql: content,
    });
  }

  return migrations;
}

async function applyMigration(migration: Migration): Promise<void> {
  const sql = getConnection();

  console.log(`Applying migration: ${migration.name}`);

  // Run the migration in a transaction
  await sql.begin(async (tx) => {
    // Execute the migration SQL
    await tx.unsafe(migration.sql);

    // Record the migration
    await tx`
      INSERT INTO migrations (name)
      VALUES (${migration.name})
    `;
  });

  console.log(`  Applied: ${migration.name}`);
}

export async function migrate(): Promise<void> {
  console.log('Starting database migrations...\n');

  try {
    // Ensure migrations table exists
    await ensureMigrationsTable();

    // Get already applied migrations
    const applied = await getAppliedMigrations();
    console.log(`Already applied: ${applied.size} migrations`);

    // Load all migrations
    const migrations = await loadMigrations();
    console.log(`Found: ${migrations.length} migration files\n`);

    // Apply pending migrations
    let appliedCount = 0;
    for (const migration of migrations) {
      if (!applied.has(migration.name)) {
        await applyMigration(migration);
        appliedCount++;
      }
    }

    if (appliedCount === 0) {
      console.log('\nNo new migrations to apply.');
    } else {
      console.log(`\nSuccessfully applied ${appliedCount} migration(s).`);
    }
  } finally {
    await closeConnection();
  }
}

export async function rollback(steps: number = 1): Promise<void> {
  console.log(`Rolling back ${steps} migration(s)...\n`);

  const sql = getConnection();

  try {
    // Get last N migrations
    const toRollback = await sql<AppliedMigration[]>`
      SELECT id, name, applied_at
      FROM migrations
      ORDER BY id DESC
      LIMIT ${steps}
    `;

    if (toRollback.length === 0) {
      console.log('No migrations to roll back.');
      return;
    }

    console.log('Migrations to roll back:');
    for (const m of toRollback) {
      console.log(`  - ${m.name} (applied at ${m.applied_at})`);
    }

    // Note: Actual rollback SQL would need to be implemented
    // This just removes from tracking table
    console.log('\nWARNING: Automatic rollback SQL is not implemented.');
    console.log('You must manually reverse the changes.');

    for (const m of toRollback) {
      await sql`DELETE FROM migrations WHERE id = ${m.id}`;
      console.log(`Removed from tracking: ${m.name}`);
    }
  } finally {
    await closeConnection();
  }
}

export async function status(): Promise<void> {
  console.log('Migration Status\n');

  try {
    await ensureMigrationsTable();

    const applied = await getAppliedMigrations();
    const migrations = await loadMigrations();

    console.log('Applied migrations:');
    for (const name of applied) {
      console.log(`  [x] ${name}`);
    }

    console.log('\nPending migrations:');
    const pending = migrations.filter(m => !applied.has(m.name));
    if (pending.length === 0) {
      console.log('  (none)');
    } else {
      for (const m of pending) {
        console.log(`  [ ] ${m.name}`);
      }
    }
  } finally {
    await closeConnection();
  }
}

// CLI entry point
const command = process.argv[2] || 'migrate';

switch (command) {
  case 'migrate':
  case 'up':
    migrate().catch(console.error);
    break;
  case 'rollback':
  case 'down':
    const steps = parseInt(process.argv[3] || '1', 10);
    rollback(steps).catch(console.error);
    break;
  case 'status':
    status().catch(console.error);
    break;
  default:
    console.log('Usage: tsx src/db/migrate.ts [migrate|rollback|status]');
    process.exit(1);
}
