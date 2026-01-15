/**
 * Migrate data from truth-ledger-claude DB to production DB
 * Source: truth_ledger schema -> Target: truth_ledger schema
 */

import 'dotenv/config';
import postgres from 'postgres';

const SOURCE_URL = 'postgresql://neondb_owner:npg_Q9Wiz8cFnpfu@ep-old-night-aeuwecox-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require';
const TARGET_URL = 'postgresql://neondb_owner:npg_LqFjlDeg8Iw6@ep-noisy-wildflower-agl26bx3-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require';

const SOURCE_SCHEMA = 'truth_ledger';
const TARGET_SCHEMA = 'truth_ledger';

// Tables to migrate in order (respecting foreign key dependencies)
const TABLES = [
  'sources',
  'documents',
  'snippets',
  'entities',
  'attributes',
  'claims',
  'evidence',
  'conflict_groups',
  'review_queue',
  'truth_metrics',
  'field_links',
];

async function getCount(sql: postgres.Sql, schema: string, table: string): Promise<number> {
  try {
    const result = await sql.unsafe(`SELECT COUNT(*) as count FROM ${schema}.${table}`);
    return parseInt(result[0].count, 10);
  } catch {
    return -1;
  }
}

async function migrate() {
  console.log('=== Migration: truth-ledger-claude → production ===\n');

  const source = postgres(SOURCE_URL);
  const target = postgres(TARGET_URL);

  try {
    // Get counts before migration
    console.log('Source data counts:');
    for (const table of TABLES) {
      const count = await getCount(source, SOURCE_SCHEMA, table);
      console.log(`  ${table}: ${count === -1 ? '(not found)' : count}`);
    }

    console.log('\nTarget data counts (before):');
    for (const table of TABLES) {
      const count = await getCount(target, TARGET_SCHEMA, table);
      console.log(`  ${table}: ${count === -1 ? '(not found)' : count}`);
    }

    // Ask for confirmation
    console.log('\n⚠️  This will REPLACE all data in production truth_ledger schema.');
    console.log('Continuing in 2 seconds...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Truncate target tables in reverse order (to handle FK constraints)
    console.log('Clearing target tables...');
    for (const table of [...TABLES].reverse()) {
      try {
        await target.unsafe(`TRUNCATE TABLE ${TARGET_SCHEMA}.${table} CASCADE`);
        console.log(`  Truncated ${table}`);
      } catch (e) {
        console.log(`  Skipped ${table}: ${(e as Error).message}`);
      }
    }

    // Migrate each table
    console.log('\nMigrating data...');
    for (const table of TABLES) {
      try {
        // Get all rows from source
        const rows = await source.unsafe(`SELECT * FROM ${SOURCE_SCHEMA}.${table}`);

        if (rows.length === 0) {
          console.log(`  ${table}: 0 rows (skipped)`);
          continue;
        }

        // Insert into target in batches using postgres.js insert helper
        const batchSize = 100;
        let inserted = 0;

        for (let i = 0; i < rows.length; i += batchSize) {
          const batch = rows.slice(i, i + batchSize);

          // Use postgres.js insert helper which handles types correctly
          await target`INSERT INTO ${target(TARGET_SCHEMA + '.' + table)} ${target(batch)}`;

          inserted += batch.length;

          if (rows.length > batchSize) {
            process.stdout.write(`\r  ${table}: ${inserted}/${rows.length} rows...`);
          }
        }

        console.log(`\r  ${table}: ${inserted} rows migrated      `);
      } catch (e) {
        console.error(`\n  ${table}: ERROR - ${(e as Error).message}`);
      }
    }

    // Verify counts
    console.log('\nTarget data counts (after):');
    for (const table of TABLES) {
      const count = await getCount(target, TARGET_SCHEMA, table);
      console.log(`  ${table}: ${count === -1 ? '(error)' : count}`);
    }

    console.log('\n✅ Migration complete!');

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await source.end();
    await target.end();
  }
}

migrate();
